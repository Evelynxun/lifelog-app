const projectsView = document.querySelector("#projectsView");
const projectView = document.querySelector("#projectView");
const projectForm = document.querySelector("#projectForm");
const projectInput = document.querySelector("#projectInput");
const projectList = document.querySelector("#projectList");
const backToProjects = document.querySelector("#backToProjects");
const returnToToday = document.querySelector("#returnToToday");
const activeProjectTitle = document.querySelector("#activeProjectTitle");
const eventForm = document.querySelector("#eventForm");
const eventInput = document.querySelector("#eventInput");
const quickInput = document.querySelector("#quickInput");
const todayDate = document.querySelector("#todayDate");
const todayPendingCount = document.querySelector("#todayPendingCount");
const todayCompletedCount = document.querySelector("#todayCompletedCount");
const todayDoneMessage = document.querySelector("#todayDoneMessage");
const todaySummaryText = document.querySelector("#todaySummaryText");
const todayStreakText = document.querySelector("#todayStreakText");
const reflectionHabitsText = document.querySelector("#reflectionHabitsText");
const reflectionTasksText = document.querySelector("#reflectionTasksText");
const reflectionStreakText = document.querySelector("#reflectionStreakText");
const reflectionNote = document.querySelector("#reflectionNote");
const summaryList = document.querySelector("#summaryList");
const todayList = document.querySelector("#todayList");
const todayTaskList = document.querySelector("#todayTaskList");
const eventList = document.querySelector("#eventList");
const taskList = document.querySelector("#taskList");
const legacyStorageKey = "eventList";
const projectsStorageKey = "lifeLogProjects";
const legacyStorageKeys = [
  "eventList",
  "lifelog-data",
  "habits",
  "tasks",
  "projects",
  "myLife",
];

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return getDateKey(date);
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeCheckIns(checkIns) {
  if (!Array.isArray(checkIns)) return [];

  const validDates = checkIns.filter((dateKey) =>
    /^\d{4}-\d{2}-\d{2}$/.test(dateKey),
  );
  return [...new Set(validDates)].sort();
}

function getCompletedDates(item) {
  const dates = [
    ...(Array.isArray(item.completedDates) ? item.completedDates : []),
    ...(Array.isArray(item.checkIns) ? item.checkIns : []),
  ];

  if (!dates.length && item.completed) {
    dates.push(getDateKey());
  }

  return normalizeCheckIns(dates);
}

function isCompletedToday(item, today = getDateKey()) {
  return getCompletedDates(item).includes(today);
}

function normalizeHabit(item) {
  const checkIns = getCompletedDates(item);

  return {
    id: item.id || createId("habit"),
    type: "habit",
    text: item.text || item.name || item.title || "",
    completed: isCompletedToday({ checkIns }),
    completedCount: checkIns.length,
    checkIns,
  };
}

function normalizeTask(item) {
  return {
    id: item.id || createId("task"),
    type: "task",
    text: item.text || item.name || item.title || "",
    completed: Boolean(item.completed),
    dueDate: item.dueDate || item.deadline || "",
  };
}

function normalizeProject(project, index = 0) {
  return {
    id: project.id || createId("project"),
    name: project.name || (index === 0 ? "My Life" : "Untitled Project"),
    habits: Array.isArray(project.habits)
      ? project.habits.map(normalizeHabit).filter((habit) => habit.text)
      : [],
    tasks: Array.isArray(project.tasks)
      ? project.tasks.map(normalizeTask).filter((task) => task.text)
      : [],
  };
}

function readStorageValue(key) {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return null;
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function mergeUniqueByText(existingItems, incomingItems) {
  const seen = new Set(
    existingItems.map((item) => `${item.type || ""}:${item.text}:${item.dueDate || ""}`),
  );
  const mergedItems = [...existingItems];

  incomingItems.forEach((item) => {
    const key = `${item.type || ""}:${item.text}:${item.dueDate || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    mergedItems.push(item);
  });

  return mergedItems;
}

function collectLegacyData(value) {
  const habits = [];
  const tasks = [];
  const projectsFromValue = [];

  function collect(input, context = "") {
    if (!input) return;

    if (Array.isArray(input)) {
      input.forEach((item) => collect(item, context));
      return;
    }

    if (typeof input !== "object") return;

    if (Array.isArray(input.projects)) {
      input.projects.forEach((project) => {
        projectsFromValue.push(normalizeProject(project));
      });
    }

    if (Array.isArray(input.habits)) {
      habits.push(...input.habits.map(normalizeHabit).filter((habit) => habit.text));
    }

    if (Array.isArray(input.tasks)) {
      tasks.push(...input.tasks.map(normalizeTask).filter((task) => task.text));
    }

    if (Array.isArray(input.events)) {
      habits.push(...input.events.map(normalizeHabit).filter((habit) => habit.text));
    }

    if (
      input.text ||
      input.name ||
      input.title
    ) {
      if (context === "tasks" || input.type === "task" || input.dueDate || input.deadline) {
        const task = normalizeTask(input);
        if (task.text) tasks.push(task);
      } else {
        const habit = normalizeHabit(input);
        if (habit.text) habits.push(habit);
      }
    }
  }

  collect(value);
  return { habits, tasks, projects: projectsFromValue };
}

function loadLegacyData() {
  return legacyStorageKeys.reduce(
    (result, key) => {
      const data = collectLegacyData(readStorageValue(key));
      result.habits.push(...data.habits);
      result.tasks.push(...data.tasks);
      result.projects.push(...data.projects);
      return result;
    },
    { habits: [], tasks: [], projects: [] },
  );
}

function createDefaultProject(legacyData = loadLegacyData()) {
  return {
    id: "project-my-life",
    name: "My Life",
    habits: legacyData.habits,
    tasks: legacyData.tasks,
  };
}

function mergeProjects(existingProjects, incomingProjects) {
  const mergedProjects = [...existingProjects];

  incomingProjects.forEach((incomingProject) => {
    const normalizedIncoming = normalizeProject(incomingProject);
    const match = mergedProjects.find(
      (project) =>
        project.id === normalizedIncoming.id || project.name === normalizedIncoming.name,
    );

    if (!match) {
      mergedProjects.push(normalizedIncoming);
      return;
    }

    match.habits = mergeUniqueByText(match.habits, normalizedIncoming.habits);
    match.tasks = mergeUniqueByText(match.tasks, normalizedIncoming.tasks);
  });

  return mergedProjects;
}

function loadProjects() {
  const legacyData = loadLegacyData();
  const defaultProject = normalizeProject(createDefaultProject(legacyData));

  try {
    const savedProjects = JSON.parse(localStorage.getItem(projectsStorageKey));
    if (Array.isArray(savedProjects) && savedProjects.length) {
      let normalizedProjects = savedProjects.map(normalizeProject);
      if (!normalizedProjects.some(isMyLifeProject)) {
        normalizedProjects.unshift(defaultProject);
      } else {
        normalizedProjects = normalizedProjects.map((project) => {
          if (!isMyLifeProject(project)) return project;

          return {
            ...project,
            habits: mergeUniqueByText(project.habits, defaultProject.habits),
            tasks: mergeUniqueByText(project.tasks, defaultProject.tasks),
          };
        });
      }
      return mergeProjects(normalizedProjects, legacyData.projects);
    }
  } catch {
    return mergeProjects([defaultProject], legacyData.projects);
  }

  return mergeProjects([defaultProject], legacyData.projects);
}

let projects = loadProjects();

function isMyLifeProject(project) {
  return project.id === "project-my-life" || project.name === "My Life";
}

function getOrderedProjects() {
  return [...projects].sort((first, second) => {
    if (isMyLifeProject(first)) return -1;
    if (isMyLifeProject(second)) return 1;
    return first.name.localeCompare(second.name);
  });
}

let activeProjectId = getOrderedProjects()[0]?.id || null;
let isProjectsPanelOpen = false;

function getActiveProject() {
  return projects.find((project) => project.id === activeProjectId) || null;
}

function getActiveHabits() {
  return getActiveProject()?.habits || [];
}

function getActiveTasks() {
  return getActiveProject()?.tasks || [];
}

function isTodayTask(task, today = getDateKey()) {
  return !task.completed && task.dueDate === today;
}

function saveProjects() {
  projects = projects.map(normalizeProject);
  localStorage.setItem(projectsStorageKey, JSON.stringify(projects));
}

function focusQuickInput() {
  if (!projectView.hidden) {
    quickInput.focus({ preventScroll: true });
  }
}

function calculateStreak(checkIns) {
  const checkedDates = new Set(normalizeCheckIns(checkIns));
  let currentDate = getDateKey();
  let streak = 0;

  while (checkedDates.has(currentDate)) {
    streak += 1;
    currentDate = addDays(currentDate, -1);
  }

  return streak;
}

function getRecentDateKeys(days) {
  return Array.from({ length: days }, (_, index) => addDays(getDateKey(), -index));
}

function createEmptyItem(text) {
  const item = document.createElement("li");
  item.className = "empty-item";
  item.textContent = text;
  return item;
}

function getProjectActivityLabel(project) {
  const latestHabitDate = project.habits
    .flatMap((habit) => getCompletedDates(habit))
    .sort()
    .at(-1);

  if (latestHabitDate === getDateKey()) {
    return "Active today";
  }

  if (latestHabitDate) {
    return `Last active ${latestHabitDate}`;
  }

  if (project.tasks.some((task) => task.completed)) {
    return "Tasks in progress";
  }

  return "No activity yet";
}

function renderProjects() {
  projectList.innerHTML = "";

  if (!projects.length) {
    projectList.append(createEmptyItem("Create your first Project to start your Life OS"));
    return;
  }

  getOrderedProjects().forEach((project) => {
    const item = document.createElement("li");
    item.className = "project-card";
    if (isMyLifeProject(project)) {
      item.classList.add("is-default-project");
    }

    const info = document.createElement("div");
    info.className = "event-info";

    const name = document.createElement("span");
    name.className = "event-text";
    name.textContent = project.name;

    const counts = document.createElement("span");
    counts.className = "stats-text";
    counts.textContent = `${project.habits.length} Habits · ${project.tasks.length} Tasks`;

    const activity = document.createElement("span");
    activity.className = "streak-text";
    activity.textContent = getProjectActivityLabel(project);

    const openButton = document.createElement("button");
    openButton.className = "check-in-button";
    openButton.type = "button";
    openButton.textContent = "Open";
    openButton.addEventListener("click", () => {
      item.classList.add("is-opening");
      openButton.disabled = true;
      window.setTimeout(() => {
        activeProjectId = project.id;
        isProjectsPanelOpen = false;
        renderApp();
        focusQuickInput();
      }, 160);
    });

    info.append(name, counts, activity);
    item.append(info, openButton);
    projectList.append(item);
  });
}

function renderSummary() {
  summaryList.innerHTML = "";
  const habits = getActiveHabits();
  const recentDates = new Set(getRecentDateKeys(7));

  if (!habits.length) {
    summaryList.append(createEmptyItem("暂无数据"));
    return;
  }

  habits.forEach((habit) => {
    const completedTimes = getCompletedDates(habit).filter((dateKey) =>
      recentDates.has(dateKey),
    ).length;

    const summaryItem = document.createElement("li");
    summaryItem.textContent = `${habit.text}：${completedTimes}次`;
    summaryList.append(summaryItem);
  });
}

function renderDailyLoop() {
  const habits = getActiveHabits();
  const tasks = getActiveTasks();
  const today = getDateKey();
  const completedHabitsToday = habits.filter((habit) =>
    isCompletedToday(habit, today),
  ).length;
  const completedTasksToday = tasks.filter(
    (task) => task.completed && task.dueDate === today,
  ).length;
  const completedToday = completedHabitsToday + completedTasksToday;
  const pendingToday =
    habits.filter((habit) => !isCompletedToday(habit, today)).length +
    tasks.filter((task) => isTodayTask(task, today)).length;
  const bestStreak = habits.reduce((best, habit) => {
    return Math.max(best, calculateStreak(getCompletedDates(habit)));
  }, 0);

  todayDate.textContent = today;
  todayPendingCount.textContent = `待完成 ${pendingToday}`;
  todayCompletedCount.textContent = `已完成 ${completedToday}`;
  todayDoneMessage.hidden = !habits.length || pendingToday > 0;
  todaySummaryText.textContent = `今天完成了 ${completedToday} 个任务`;
  todayStreakText.textContent = `当前最高连续 ${bestStreak} 天`;
  reflectionHabitsText.textContent = `今日完成 Habits：${completedHabitsToday}`;
  reflectionTasksText.textContent = `今日完成 Tasks：${completedTasksToday}`;
  reflectionStreakText.textContent = `当前 streak：${bestStreak} 天`;

  if (completedHabitsToday > 0) {
    reflectionNote.textContent = `今天你完成了 ${completedHabitsToday} 个习惯，保持了不错的节奏`;
  } else if (habits.length > 0) {
    reflectionNote.textContent = "今天没有完成 Habit，可以明天重新开始";
  } else {
    reflectionNote.textContent = "先添加一个 Habit，开始建立你的每日节奏";
  }
}

function createHabitItem(habit, index) {
  const today = getDateKey();
  const completedDates = getCompletedDates(habit);
  const checkedToday = completedDates.includes(today);
  const streak = calculateStreak(completedDates);
  const item = document.createElement("li");
  if (checkedToday) {
    item.classList.add("is-checked-today");
  }

  const info = document.createElement("div");
  info.className = "event-info";

  const text = document.createElement("span");
  text.className = "event-text";
  text.textContent = habit.text;

  const statsText = document.createElement("span");
  statsText.className = "stats-text";
  statsText.textContent = `已完成次数：${completedDates.length}次`;

  const streakText = document.createElement("span");
  streakText.className = "streak-text";
  streakText.textContent = `🔥 连续 ${streak} 天`;

  const button = document.createElement("button");
  button.className = "check-in-button";
  button.type = "button";
  button.textContent = checkedToday ? "今天已完成" : "完成";
  button.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project) return;

    if (isCompletedToday(project.habits[index], today)) {
      alert("今天已完成");
      return;
    }

    const updatedDates = normalizeCheckIns([
      ...getCompletedDates(project.habits[index]),
      today,
    ]);
    project.habits[index].checkIns = updatedDates;
    project.habits[index].completed = updatedDates.includes(today);
    project.habits[index].completedCount = updatedDates.length;
    saveProjects();
    button.disabled = true;
    item.classList.add("is-completing");
    window.setTimeout(renderProjectContent, 240);
  });

  info.append(text, statsText, streakText);
  item.append(info, button);
  return item;
}

function createTaskItem(task, index) {
  const item = document.createElement("li");
  if (task.completed) {
    item.classList.add("is-checked-today");
  }

  const info = document.createElement("div");
  info.className = "event-info";

  const text = document.createElement("span");
  text.className = "event-text";
  text.textContent = task.text;

  const meta = document.createElement("span");
  meta.className = "stats-text";
  meta.textContent = task.dueDate ? `截止日期：${task.dueDate}` : "一次性任务";

  const button = document.createElement("button");
  button.className = "check-in-button";
  button.type = "button";
  button.textContent = task.completed ? "已完成" : "完成";
  button.addEventListener("click", () => {
    const project = getActiveProject();
    if (!project || project.tasks[index].completed) return;

    project.tasks[index].completed = true;
    saveProjects();
    button.disabled = true;
    item.classList.add("is-completing");
    window.setTimeout(renderProjectContent, 240);
  });

  info.append(text, meta);
  item.append(info, button);
  return item;
}

function renderProjectContent() {
  const project = getActiveProject();
  if (!project) return;

  activeProjectTitle.textContent = project.name;
  renderDailyLoop();
  renderSummary();
  todayList.innerHTML = "";
  todayTaskList.innerHTML = "";
  eventList.innerHTML = "";
  taskList.innerHTML = "";

  let hasTodayHabits = false;
  let hasTodayTasks = false;
  project.habits.forEach((habit, index) => {
    if (!isCompletedToday(habit)) {
      todayList.append(createHabitItem(habit, index));
      hasTodayHabits = true;
    }

    eventList.append(createHabitItem(habit, index));
  });

  project.tasks.forEach((task, index) => {
    if (isTodayTask(task)) {
      todayTaskList.append(createTaskItem(task, index));
      hasTodayTasks = true;
    }

    taskList.append(createTaskItem(task, index));
  });

  if (!hasTodayHabits) {
    todayList.append(createEmptyItem("今天没有待完成习惯"));
  }

  if (!hasTodayTasks) {
    todayTaskList.append(createEmptyItem("今天没有待完成任务"));
  }

  if (!project.habits.length) {
    eventList.append(createEmptyItem("还没有习惯，先添加一条记录"));
  }

  if (!project.tasks.length) {
    taskList.append(createEmptyItem("还没有任务"));
  }
}

function renderApp() {
  if (!activeProjectId) {
    activeProjectId = getOrderedProjects()[0]?.id || null;
  }

  let project = getActiveProject();
  if (!project) {
    activeProjectId = getOrderedProjects()[0]?.id || null;
    project = getActiveProject();
  }

  projectsView.hidden = !isProjectsPanelOpen;
  projectView.hidden = isProjectsPanelOpen;

  if (isProjectsPanelOpen) {
    renderProjects();
    return;
  }

  renderProjectContent();
}

function addHabit(text) {
  const project = getActiveProject();
  if (!project || !text) return;

  project.habits.push({
    id: createId("habit"),
    type: "habit",
    text,
    completed: false,
    completedCount: 0,
    checkIns: [],
  });
  saveProjects();
  renderProjectContent();
}

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = projectInput.value.trim();
  if (!name) return;

  projects.push({
    id: createId("project"),
    name,
    habits: [],
    tasks: [],
  });
  saveProjects();
  projectInput.value = "";
  renderProjects();
});

backToProjects.addEventListener("click", () => {
  isProjectsPanelOpen = true;
  renderApp();
  projectInput.focus({ preventScroll: true });
});

returnToToday.addEventListener("click", () => {
  isProjectsPanelOpen = false;
  renderApp();
  focusQuickInput();
});

quickInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  event.preventDefault();
  const scrollPosition = {
    x: window.scrollX,
    y: window.scrollY,
  };
  const text = quickInput.value.trim();
  addHabit(text);

  quickInput.value = "";
  focusQuickInput();
  requestAnimationFrame(() => {
    window.scrollTo(scrollPosition.x, scrollPosition.y);
  });
});

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = eventInput.value.trim();
  addHabit(text);

  eventInput.value = "";
  eventInput.focus();
});

saveProjects();
renderApp();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
