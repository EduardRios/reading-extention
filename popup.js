//PopUp logic 

document.addEventListener('DOMContentLoaded', () => {
  //references to all the buttons and inputs
  const detectButton = document.getElementById('detect');
  const clearButton = document.getElementById('clear');
  const previewTextarea = document.getElementById('preview');
  const readButton = document.getElementById('read');
  const pauseButton = document.getElementById('pause');
  const resumeButton = document.getElementById('resume');
  const rateInput = document.getElementById('rate');
  const rateValue = document.getElementById('rate-value');

  // Set initial rate value display and update on change
  rateValue.textContent = parseFloat(rateInput.value).toFixed(1);
  rateInput.addEventListener('input', (event) => {
    rateValue.textContent = parseFloat(event.target.value).toFixed(1);
  });

  let currentTabId = null;

  // Get the target tabId from the URL query parameter passed by background.js
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const tabIdFromUrl = parseInt(urlParams.get('tabId'));
    if (tabIdFromUrl) {
      currentTabId = tabIdFromUrl;
    } else {
      throw new Error('Tab ID not found in URL');
    }
  } catch (e) {
    previewTextarea.value = `Error: Could not determine the target tab. ${e.message}`;
    // Disable the button if we don't have a target.
    detectButton.disabled = true;
  }

  // When "Select Text" is clicked, use the tab ID we got from the URL
  detectButton.addEventListener('click', () => {
    if (!currentTabId) {
      previewTextarea.value = "Error: No valid Tab ID to operate on.";
      return;
    }

    // Ensure our scripts are injected into the correct tab.
    chrome.scripting.insertCSS({ target: { tabId: currentTabId }, files: ['content.css'] }, () => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
        }
    });
    chrome.scripting.executeScript({ target: { tabId: currentTabId }, files: ['content.js'] }, () => {
      if (chrome.runtime.lastError) {
        previewTextarea.value = 'Error: ' + chrome.runtime.lastError.message;
        return;
      }
      // After ensuring the script is ready, tell it to enter selection mode.
      chrome.tabs.sendMessage(currentTabId, { action: 'enterSelectionMode' });
    });
  });

  // Clear button functionality
  clearButton.addEventListener('click', () => {
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, { action: 'clearHighlights' });
    }
    previewTextarea.value = "";
  });

  // Listen for the selected text coming back from the content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "textSelected") {
      previewTextarea.value = request.text;
    }
  });

  // The TTS controls work as before
  readButton.addEventListener('click', () => {
    const text = previewTextarea.value;
    if (text) {
      chrome.tts.stop();
      chrome.tts.speak(text, {
        rate: parseFloat(rateInput.value)
      });
    }
  });

  pauseButton.addEventListener('click', () => chrome.tts.pause());
  resumeButton.addEventListener('click', () => chrome.tts.resume());
});
