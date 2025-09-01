document.addEventListener('DOMContentLoaded', () => {
  // Get all the buttons and controls from the HTML
  const detectButton = document.getElementById('detect');
  const clearButton = document.getElementById('clear');
  const previewTextarea = document.getElementById('preview');
  const readButton = document.getElementById('read');
  const pauseButton = document.getElementById('pause');
  const resumeButton = document.getElementById('resume');
  const stopButton = document.getElementById('stop');
  const rateInput = document.getElementById('rate');
  const pitchInput = document.getElementById('pitch');

  //Detect and highlight button
  detectButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;

      // Inject CSS first
      chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ['content.css']
      }, () => {
        if (chrome.runtime.lastError) {
          previewTextarea.value = 'Error: ' + chrome.runtime.lastError.message;
          console.error(chrome.runtime.lastError.message);
          return;
        }

        // Then, use the Scripting API to inject the JS files
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['Readability.js', 'content.js']
        }, () => {
          // This callback runs after the files have been injected.
          // Now it's safe to send the message.
          if (chrome.runtime.lastError) {
            previewTextarea.value = 'Error: ' + chrome.runtime.lastError.message;
            console.error(chrome.runtime.lastError.message);
            return;
          }

          chrome.tabs.sendMessage(tabId, { action: 'highlightText' });
        });
      });
    });
  });

  //Clear Button
  clearButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'clearHighlights' });
      }
    });
    previewTextarea.value = "";
  });

  //Set text in textArea
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "setText") {
      previewTextarea.value = request.text;
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