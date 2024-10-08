// Timer variables
let timerInterval;
let startTime;
let elapsedTime = 0;
let isTimerRunning = false;
const firstIntervalDuration = 20 * 60 * 1000; // 20 minutes in milliseconds
const secondIntervalDuration = 20 * 1000; // 20 seconds for break

// Start timer
function startTimer() {
    chrome.storage.local.get(["startTime", "elapsedTime"], function (result) {
        startTime = result.startTime || Date.now();
        elapsedTime = result.elapsedTime || 0;
        if (elapsedTime > 0) {
            startTime = Date.now() - elapsedTime; // Adjust start time by elapsed time
        }
        clearInterval(timerInterval); // Clear any existing interval
        timerInterval = setInterval(updateTimer, 1000);
        isTimerRunning = true;
        chrome.storage.local.set({ isTimerRunning: true, startTime: startTime });
        chrome.runtime.sendMessage({ type: "timerStateChanged", isRunning: true, isPaused: false });
        updateTimer(); // Update immediately
    });
}

// Pause timer
function pauseTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    chrome.storage.local.set({ isTimerRunning: false, elapsedTime: elapsedTime });
    chrome.runtime.sendMessage({ type: "timerStateChanged", isRunning: false, isPaused: true });
}

// Resume timer
function resumeTimer() {
    if (!isTimerRunning) {
        startTime = Date.now() - elapsedTime;
        clearInterval(timerInterval); // Clear any existing interval
        timerInterval = setInterval(updateTimer, 1000);
        isTimerRunning = true;
        chrome.storage.local.set({ isTimerRunning: true, startTime: startTime });
        chrome.runtime.sendMessage({ type: "timerStateChanged", isRunning: true, isPaused: false });
        updateTimer(); // Update immediately
    }
}

// Reset timer
function resetTimer() {
    clearInterval(timerInterval);
    elapsedTime = 0;
    isTimerRunning = false;
    chrome.storage.local.set({ startTime: null, elapsedTime: 0, isTimerRunning: false });
    chrome.runtime.sendMessage({ type: "updateTimer", time: formatTime(firstIntervalDuration) });
    chrome.runtime.sendMessage({ type: "timerStateChanged", isRunning: false, isPaused: false });
}

// Update timer
function updateTimer() {
    const currentTime = Date.now();
    elapsedTime = currentTime - startTime;
    const remainingTime = firstIntervalDuration - elapsedTime;

    if (remainingTime <= 0) {
        clearInterval(timerInterval);
        chrome.runtime.sendMessage({ type: "updateTimer", time: "00:00" });
        notifyBreakTime();
        startShortTimer();
    } else {
        const formattedTime = formatTime(remainingTime);
        chrome.runtime.sendMessage({ type: "updateTimer", time: formattedTime });
        chrome.action.setBadgeText({ text: formattedTime });
    }
}

// Format time function
function formatTime(time) {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Function to notify break time
function notifyBreakTime() {
    chrome.notifications.create("breakTimeNotification", {
        type: "basic",
        iconUrl: "images/icon48.png",
        title: "Take a break!",
        message: "It's time to take a break. Look at something 20 feet away for 20 seconds."
    });
}

// Function to start short break timer
function startShortTimer() {
    startTime = Date.now();
    clearInterval(timerInterval); // Clear any existing interval
    timerInterval = setInterval(() => {
        const elapsedBreakTime = Date.now() - startTime;
        const remainingBreakTime = secondIntervalDuration - elapsedBreakTime;

        if (remainingBreakTime <= 0) {
            clearInterval(timerInterval);
            chrome.runtime.sendMessage({ type: "updateTimer", time: formatTime(firstIntervalDuration) });
            notifyBreakEnd();
        } else {
            const formattedTime = formatTime(remainingBreakTime);
            chrome.runtime.sendMessage({ type: "updateTimer", time: formattedTime });
            chrome.action.setBadgeText({ text: formattedTime });
        }
    }, 1000);
}

// Function to notify break end
function notifyBreakEnd() {
    chrome.notifications.create("breakEndNotification", {
        type: "basic",
        iconUrl: "images/icon48.png",
        title: "Break time over",
        message: "Time to get back to work! The 20-20-20 timer will restart."
    });
    startTimer();
}

// Function to handle schedule updates
function handleScheduleUpdate(startTime, endTime) {
    console.log("Updating schedule:", startTime, endTime);
    chrome.storage.local.set({ startTime, endTime }, function() {
        console.log("Schedule saved in storage");
        startScheduleCheck();
    });
}

// Function to start checking the schedule
function startScheduleCheck() {
    console.log("Starting schedule check");
    if (window.scheduleCheckInterval) {
        clearInterval(window.scheduleCheckInterval);
    }
    window.scheduleCheckInterval = setInterval(checkScheduleAndStartTimer, 60000);
    checkScheduleAndStartTimer(); // Check immediately
}

// Function to check schedule and start timer if needed
function checkScheduleAndStartTimer() {
    chrome.storage.local.get(['startTime', 'endTime', 'isTimerRunning'], function(result) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

        console.log("Checking schedule:", currentTime, result);

        if (isTimeInSchedule(currentTime, result)) {
            if (!result.isTimerRunning) {
                console.log("Starting timer based on schedule");
                startTimer();
            }
        } else if (result.isTimerRunning) {
            console.log("Pausing timer based on schedule");
            pauseTimer();
        }
    });
}

// Function to check if current time is within the schedule
function isTimeInSchedule(currentTime, schedule) {
    const { startTime, endTime } = schedule;
    if (!startTime || !endTime) return false;

    const current = new Date(`2000-01-01T${currentTime}`);
    const start = new Date(`2000-01-01T${startTime}`);
    let end = new Date(`2000-01-01T${endTime}`);

    // Handle case where end time is on the next day
    if (end < start) {
        end = new Date(`2000-01-02T${endTime}`);
        if (current < start) current.setDate(current.getDate() + 1);
    }

    return current >= start && current <= end;
}

// Listen for messages from popup script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log("Received message:", message);
    switch (message.type) {
        case "startTimer":
            startTimer();
            break;
        case "pauseTimer":
            pauseTimer();
            break;
        case "resumeTimer":
            resumeTimer();
            break;
        case "resetTimer":
            resetTimer();
            break;
        case "getTimerState":
            chrome.storage.local.get(["isTimerRunning", "elapsedTime", "startTime"], function (result) {
                console.log("getTimerState result:", result);
                const remainingTime = result.startTime ? 
                    firstIntervalDuration - (Date.now() - result.startTime) : 
                    firstIntervalDuration - (result.elapsedTime || 0);
                sendResponse({
                    isTimerRunning: result.isTimerRunning || false,
                    elapsedTime: result.elapsedTime || 0,
                    currentTime: formatTime(Math.max(0, remainingTime))
                });
            });
            return true; // asynchronous response
        case "updateSchedule":
            handleScheduleUpdate(message.startTime, message.endTime);
            sendResponse({ success: true });
            return true; // asynchronous response
    }
});

// Initialization
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
    resetTimer();
    startScheduleCheck();
});

chrome.runtime.onStartup.addListener(() => {
    console.log("Extension started");
    startScheduleCheck();
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === "activate_extension") {
        console.log("Extension Activated");
        chrome.action.openPopup();
    }
});
