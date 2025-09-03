document.addEventListener('DOMContentLoaded', () => {
  const detectButton = document.getElementById('detect');
  const clearButton = document.getElementById('clear');
  const previewTextarea = document.getElementById('preview');
  const readButton = document.getElementById('read');
  const pauseButton = document.getElementById('pause');
  const resumeButton = document.getElementById('resume');
  const stopButton = document.getElementById('stop');
  const rateInput = document.getElementById('rate');
  const pitchInput = document.getElementById('pitch');

  let readableElements = [];
  let currentTabId = null;

  const updatePreview = () => {
    previewTextarea.value = readableElements.map(el => el.text).join('\n\n');
  };

  const loadStateForTab = (tabId) => {
    currentTabId = tabId;
    const storageKey = tabId.toString();
    chrome.storage.session.get([storageKey], (result) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      if (result[storageKey]) {
        readableElements = result[storageKey];
        updatePreview();
      }
    });
  };

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      loadStateForTab(tabs[0].id);
    }
  });

  detectButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;
      currentTabId = tabId;

      chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['content.css'] }, () => {
        if (chrome.runtime.lastError) {
          previewTextarea.value = 'Error: ' + chrome.runtime.lastError.message;
          return;
        }

        chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['Readability.js', 'content.js'] }, () => {
          if (chrome.runtime.lastError) {
            previewTextarea.value = 'Error: ' + chrome.runtime.lastError.message;
            return;
          }
          chrome.tabs.sendMessage(tabId, { action: 'highlightText' });
        });
      });
    });
  });

  clearButton.addEventListener('click', () => {
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, { action: 'clearHighlights' });
      chrome.storage.session.remove(currentTabId.toString());
    }
    previewTextarea.value = "";
    readableElements = [];
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!currentTabId) {
      // If tab context is not set, try to get it from the sender.
      if (sender.tab) {
        currentTabId = sender.tab.id;
      } else {
        console.error("Received message without a tab context.");
        return;
      }
    }
    
    const storageKey = currentTabId.toString();

    if (request.action === "setTextElements") {
      readableElements = request.elements;
      updatePreview();
      chrome.storage.session.set({ [storageKey]: readableElements });
    }

    if (request.action === "removeTextById") {
      readableElements = readableElements.filter(el => el.id !== request.idToRemove);
      updatePreview();
      chrome.storage.session.set({ [storageKey]: readableElements });
    }
  });

  readButton.addEventListener('click', () => {
    const text = previewTextarea.value;
    if (text) {
      chrome.tts.stop();
      chrome.tts.speak(text, {
        rate: parseFloat(rateInput.value),
        pitch: parseFloat(pitchInput.value),
        onEvent: (event) => {
          // This is where we will add the highlighting logic later
        }
      });
    }
  });

  pauseButton.addEventListener('click', () => chrome.tts.pause());
  resumeButton.addEventListener('click', () => chrome.tts.resume());
  stopButton.addEventListener('click', () => chrome.tts.stop());
});
