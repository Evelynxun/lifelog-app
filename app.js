const eventForm = document.querySelector("#eventForm");
const eventInput = document.querySelector("#eventInput");
const quickInput = document.querySelector("#quickInput");
const summaryList = document.querySelector("#summaryList");
const todayList = document.querySelector("#todayList");
const eventList = document.querySelector("#eventList");
const storageKey = "eventList";

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

function normalizeCheckIns(checkIns) {
  if (!Array.isArray(checkIns)) return [];

  const validDates = checkIns.filter((dateKey) =>
    /^\d{4}-\d{2}-\d{2}$/.test(dateKey),
  );
  return [...new Set(validDates)].sort();
}

function getCompletedDates(eventItem) {
  const dates = [
    ...(Array.isArray(eventItem.completedDates) ? eventItem.completedDates : []),
    ...(Array.isArray(eventItem.checkIns) ? eventItem.checkIns : []),
  ];

  if (!dates.length && eventItem.completed) {
    dates.push(getDateKey());
  }

  return normalizeCheckIns(dates);
}

function isCompletedToday(eventItem, today = getDateKey()) {
  return getCompletedDates(eventItem).includes(today);
}

function normalizeEvent(eventItem) {
  const checkIns = getCompletedDates(eventItem);

  return {
    text: eventItem.text || "",
    completed: isCompletedToday({ checkIns }),
    completedCount: checkIns.length,
    checkIns,
  };
}

function loadEvents() {
  try {
    const savedEvents = JSON.parse(localStorage.getItem(storageKey)) || [];
    if (!Array.isArray(savedEvents)) return [];

    return savedEvents
      .map(normalizeEvent)
      .filter((eventItem) => eventItem.text);
  } catch {
    return [];
  }
}

let events = loadEvents();

function saveEvents() {
  events = events.map(normalizeEvent);
  localStorage.setItem(storageKey, JSON.stringify(events));
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

function renderSummary() {
  summaryList.innerHTML = "";
  const recentDates = new Set(getRecentDateKeys(7));

  events.forEach((eventItem) => {
    const completedTimes = getCompletedDates(eventItem).filter((dateKey) =>
      recentDates.has(dateKey),
    ).length;

    const summaryItem = document.createElement("li");
    summaryItem.textContent = `${eventItem.text}：${completedTimes}次`;
    summaryList.append(summaryItem);
  });
}

function createEventItem(eventItem, index) {
  const today = getDateKey();
  const completedDates = getCompletedDates(eventItem);
  const checkedToday = completedDates.includes(today);
  const streak = calculateStreak(completedDates);
  const item = document.createElement("li");
  if (checkedToday) {
    item.classList.add("is-checked-today");
  }

  const eventInfo = document.createElement("div");
  eventInfo.className = "event-info";

  const itemText = document.createElement("span");
  itemText.className = "event-text";
  itemText.textContent = eventItem.text;

  const statsText = document.createElement("span");
  statsText.className = "stats-text";
  statsText.textContent = `已完成次数：${completedDates.length}次`;

  const streakText = document.createElement("span");
  streakText.className = "streak-text";
  streakText.textContent = `🔥 连续 ${streak} 天`;

  eventInfo.append(itemText, statsText, streakText);

  const checkInButton = document.createElement("button");
  checkInButton.className = "check-in-button";
  checkInButton.type = "button";
  checkInButton.textContent = checkedToday ? "今天已完成" : "完成";
  checkInButton.addEventListener("click", () => {
    if (isCompletedToday(events[index], today)) {
      alert("今天已完成");
      return;
    }

    const updatedDates = normalizeCheckIns([
      ...getCompletedDates(events[index]),
      today,
    ]);
    events[index].checkIns = updatedDates;
    events[index].completed = updatedDates.includes(today);
    events[index].completedCount = updatedDates.length;
    saveEvents();
    renderEvents();
  });

  item.append(eventInfo, checkInButton);
  return item;
}

function renderEvents() {
  renderSummary();
  todayList.innerHTML = "";
  eventList.innerHTML = "";

  events.forEach((eventItem, index) => {
    if (!isCompletedToday(eventItem)) {
      todayList.append(createEventItem(eventItem, index));
    }

    eventList.append(createEventItem(eventItem, index));
  });
}

function addEvent(text) {
  if (!text) return;

  events.push({
    text,
    completed: false,
    completedCount: 0,
    checkIns: [],
  });
  saveEvents();
  renderEvents();
}

quickInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  event.preventDefault();
  const text = quickInput.value.trim();
  addEvent(text);

  quickInput.value = "";
});

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = eventInput.value.trim();
  addEvent(text);

  eventInput.value = "";
  eventInput.focus();
});

saveEvents();
renderEvents();
quickInput.focus();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
