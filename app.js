const projectsView = document.querySelector("#projectsView");
const projectView = document.querySelector("#projectView");
const projectForm = document.querySelector("#projectForm");
const projectInput = document.querySelector("#projectInput");
const projectList = document.querySelector("#projectList");
const backToProjects = document.querySelector("#backToProjects");
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
const summaryList = document.querySelector("#summaryList");
const todayList = document.querySelector("#todayList");
const eventList = document.querySelector("#eventList");
const taskList = document.querySelector("#taskList");
const legacyStorageKey = "eventList";
const projectsStorageKey = "lifeLogProjects";

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

function loadLegacyHabits() {
  try {
    const savedEvents = JSON.parse(localStorage.getItem(legacyStorageKey)) || [];
    if (!Array.isArray(savedEvents)) return [];
    return savedEvents.map(normalizeHabit).filter((habit) => habit.text);
  } catch {
    return [];
  }
}

function createDefaultProject() {
  return {
    id: "project-my-life",
    name: "My Life",
    habits: loadLegacyHabits(),
    tasks: [],
  };
}

function loadProjects() {
  try {
    const savedProjects = JSON.parse(localStorage.getItem(projectsStorageKey));
    if (Array.isArray(savedProjects) && savedProjects.length) {
      return savedProjects.map(normalizeProject);
    }
  } catch {
    return [normalizeProject(createDefaultProject())];
  }

  return [normalizeProject(createDefaultProject())];
}

let projects = loadProjects();
let activeProjectId = null;

function getActiveProject() {
  return projects.find((project) => project.id === activeProjectId) || null;
}

function getActiveHabits() {
  return getActiveProject()?.habits || [];
}

function getActiveTasks() {
  return getActiveProject()?.tasks || [];
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

function renderProjects() {
  projectList.innerHTML = "";

  projects.forEach((project) => {
    const item = document.createElement("li");
    item.className = "project-card";

    const info = document.createElement("div");
    info.className = "event-info";

    const name = document.createElement("span");
    name.className = "event-text";
    name.textContent = project.name;

    const meta = document.createElement("span");
    meta.className = "stats-text";
    meta.textContent = `${project.habits.length} habits · ${project.tasks.length} tasks`;

    const openButton = document.createElement("button");
    openButton.className = "check-in-button";
    openButton.type = "button";
    openButton.textContent = "Open";
    openButton.addEventListener("click", () => {
      activeProjectId = project.id;
      renderApp();
      focusQuickInput();
    });

    info.append(name, meta);
    item.append(info, openButton);
    projectList.append(item);
  });
}

function renderSummary() {
  summaryList.innerHTML = "";
  const habits = getActiveHabits();
  const recentDates = new Set(getRecentDateKeys(7));

  if (!habits.length) {
    summaryList.append(createEmptyItem("开始记录后，这里会显示最近7天趋势"));
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
  const today = getDateKey();
  const completedToday = habits.filter((habit) =>
    isCompletedToday(habit, today),
  ).length;
  const pendingToday = habits.length - completedToday;
  const bestStreak = habits.reduce((best, habit) => {
    return Math.max(best, calculateStreak(getCompletedDates(habit)));
  }, 0);

  todayDate.textContent = today;
  todayPendingCount.textContent = `待完成 ${pendingToday}`;
  todayCompletedCount.textContent = `已完成 ${completedToday}`;
  todayDoneMessage.hidden = !habits.length || pendingToday > 0;
  todaySummaryText.textContent = `今天完成了 ${completedToday} 个任务`;
  todayStreakText.textContent = `当前最高连续 ${bestStreak} 天`;
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
  eventList.innerHTML = "";
  taskList.innerHTML = "";

  let hasTodayItems = false;
  project.habits.forEach((habit, index) => {
    if (!isCompletedToday(habit)) {
      todayList.append(createHabitItem(habit, index));
      hasTodayItems = true;
    }

    eventList.append(createHabitItem(habit, index));
  });

  project.tasks.forEach((task, index) => {
    taskList.append(createTaskItem(task, index));
  });

  if (!hasTodayItems) {
    todayList.append(createEmptyItem("今天没有待完成习惯"));
  }

  if (!project.habits.length) {
    eventList.append(createEmptyItem("还没有习惯，先添加一条记录"));
  }

  if (!project.tasks.length) {
    taskList.append(createEmptyItem("还没有任务"));
  }
}

function renderApp() {
  const project = getActiveProject();
  projectsView.hidden = Boolean(project);
  projectView.hidden = !project;

  if (project) {
    renderProjectContent();
  } else {
    renderProjects();
  }
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
  activeProjectId = null;
  renderApp();
  projectInput.focus({ preventScroll: true });
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
