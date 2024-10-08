const shortcutInput = document.getElementById('shortcut');
const saveButton = document.getElementById('saveShortcut');
const message = document.getElementById('message');

// Load saved shortcut from storage
chrome.storage.sync.get(['eyeProtectionShortcut'], function(result) {
    if (result.eyeProtectionShortcut) {
        shortcutInput.value = result.eyeProtectionShortcut;
    }
});

// Save shortcut and open the Chrome Extensions Shortcuts page
saveButton.addEventListener('click', function() {
    const shortcut = shortcutInput.value;
    
    // Save the shortcut to chrome storage
    chrome.storage.sync.set({eyeProtectionShortcut: shortcut}, function() {
        // Notify the user that the shortcut is saved
        message.textContent = 'Shortcut saved. Redirecting to Chrome Shortcuts page...';
        message.style.display = 'block';

        // Open Chrome Extensions Shortcuts page in a new tab
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });

        // Hide the message after 3 seconds
        setTimeout(() => {
            message.style.display = 'none';
        }, 3000);
    });
});

// Capture the key combination entered by the user
shortcutInput.addEventListener('keydown', function(e) {
    e.preventDefault();
    const keys = [];
    
    // Capture modifier keys
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey) keys.push('Command');
    
    // Capture alphanumeric keys
    if (e.key.length === 1) {
        keys.push(e.key.toUpperCase());
    }

    console.log(`Captured keys: ${keys.join('+')}`); // Log the captured keys
    shortcutInput.value = keys.join('+'); // Update the input field with captured keys
});
