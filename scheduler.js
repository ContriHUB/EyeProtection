// Scheduler for 20-20-20 Eye Protection Timer

let scheduleCheckInterval;

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

// Function to check schedule and start timer if needed
function checkScheduleAndStartTimer() {
    chrome.storage.local.get(['startTime', 'endTime', 'isTimerRunning'], function(result) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

        console.log("Checking schedule:", currentTime, result); // Debug log

        if (isTimeInSchedule(currentTime, result)) {
            if (!result.isTimerRunning) {
                console.log("Starting timer based on schedule"); // Debug log
                chrome.runtime.sendMessage({ type: "startTimer" });
            }
        } else if (result.isTimerRunning) {
            console.log("Pausing timer based on schedule"); // Debug log
            chrome.runtime.sendMessage({ type: "pauseTimer" });
        }
    });
}

// Function to start the scheduler
function startScheduler() {
    if (scheduleCheckInterval) {
        clearInterval(scheduleCheckInterval);
    }
    scheduleCheckInterval = setInterval(checkScheduleAndStartTimer, 60000); // Check every minute
    console.log("Scheduler started");
}

// Function to stop the scheduler
function stopScheduler() {
    if (scheduleCheckInterval) {
        clearInterval(scheduleCheckInterval);
        scheduleCheckInterval = null;
        console.log("Scheduler stopped");
    }
}

// Listen for messages to update the schedule
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "updateSchedule") {
        chrome.storage.local.set({ startTime: message.startTime, endTime: message.endTime }, function() {
            console.log("Schedule updated:", message.startTime, message.endTime); // Debug log
            checkScheduleAndStartTimer(); // Check immediately after updating
        });
    }
});

// Initialize the scheduler
chrome.runtime.onInstalled.addListener(startScheduler);
chrome.runtime.onStartup.addListener(startScheduler);

// Export functions for use in background.js
window.scheduler = {
    startScheduler,
    stopScheduler,
    checkScheduleAndStartTimer
};