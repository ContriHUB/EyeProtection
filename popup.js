const timerElement = document.getElementById("timer");
const pauseButton = document.getElementById("pause");
const startButton = document.getElementById("start");
const resumeButton = document.getElementById("resume");
const resetButton = document.getElementById("reset");
const themeToggle = document.getElementById("theme-toggle");

// Schedule Tab elements
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const saveScheduleButton = document.getElementById("saveSchedule");

// Timer state variables
let isTimerPaused = false;
let isTimerRunning = false;

// Switch between timer and schedule tabs
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', function() {
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.style.display = 'none';
    });
    document.getElementById(this.dataset.target).style.display = 'block';
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    this.classList.add('active');
  });
});

// Function to update button states
function updateButtonStates() {
  startButton.disabled = isTimerRunning;
  pauseButton.disabled = !isTimerRunning || isTimerPaused;
  resumeButton.disabled = !isTimerPaused || isTimerRunning;
  resetButton.disabled = false;
}

// Function to start the timer
startButton.addEventListener("click", function() {
  chrome.runtime.sendMessage({ type: "startTimer" });
});

// Function to pause the timer
pauseButton.addEventListener("click", function() {
  chrome.runtime.sendMessage({ type: "pauseTimer" });
});

// Function to resume the timer
resumeButton.addEventListener("click", function() {
  chrome.runtime.sendMessage({ type: "resumeTimer" });
});

// Function to reset the timer
resetButton.addEventListener("click", function() {
  chrome.runtime.sendMessage({ type: "resetTimer" });
});

// Listen for timer updates from background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.type === "updateTimer") {
    timerElement.textContent = message.time;
  } else if (message.type === "timerStateChanged") {
    isTimerRunning = message.isRunning;
    isTimerPaused = message.isPaused;
    updateButtonStates();
  }
});

// Function to save the schedule
saveScheduleButton.addEventListener("click", function() {
  const startTime = startTimeInput.value;
  const endTime = endTimeInput.value;

  if (startTime && endTime) {
    updateSchedule(startTime, endTime);
  } else {
    alert("Please set both a start and end time.");
  }
});

// Function to update schedule
function updateSchedule(startTime, endTime) {
  chrome.runtime.sendMessage({
    type: "updateSchedule",
    startTime: startTime,
    endTime: endTime
  }, function(response) {
    if (response && response.success) {
      alert("Schedule saved!");
    } else {
      alert("Failed to save schedule. Please try again.");
    }
  });
}

// Theme toggle
themeToggle.addEventListener("change", function() {
  if (this.checked) {
    document.body.classList.add("dark-theme");
    localStorage.setItem("darkTheme", "enabled");
  } else {
    document.body.classList.remove("dark-theme");
    localStorage.setItem("darkTheme", "disabled");
  }
});

// Function to detect and apply system theme
function detectSystemTheme() {
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (localStorage.getItem("darkTheme") === null) {
    if (prefersDarkScheme) {
      document.body.classList.add("dark-theme");
      themeToggle.checked = true;
      localStorage.setItem("darkTheme", "enabled");
    } else {
      document.body.classList.remove("dark-theme");
      themeToggle.checked = false;
      localStorage.setItem("darkTheme", "disabled");
    }
  } else if (localStorage.getItem("darkTheme") === "enabled") {
    document.body.classList.add("dark-theme");
    themeToggle.checked = true;
  } else {
    document.body.classList.remove("dark-theme");
  }
}

// Load initial theme, timer state, and saved schedule times
window.addEventListener("load", function() {
  console.log("Popup window loaded");
  detectSystemTheme();
  chrome.runtime.sendMessage({ type: "getTimerState" }, function(response) {
    console.log("Received timer state:", response);
    if (response) {
      isTimerRunning = response.isTimerRunning;
      isTimerPaused = !isTimerRunning && response.elapsedTime > 0;
      updateButtonStates();
      if (response.currentTime) {
        timerElement.textContent = response.currentTime;
      }
    }
  });

  // Load saved schedule times
  chrome.storage.local.get(["startTime", "endTime"], function(result) {
    console.log("Loaded saved schedule:", result);
    if (result.startTime) startTimeInput.value = result.startTime;
    if (result.endTime) endTimeInput.value = result.endTime;
  });
});

console.log("Popup script loaded");