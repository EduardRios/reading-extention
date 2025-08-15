// This script is the "Waiter" - it manages the popup UI and talks to the "Chef".

document.addEventListener('DOMContentLoaded', () => {
  // 1. Get all the buttons and controls from the HTML
  const detectButton = document.getElementById('detect');
  const previewTextarea = document.getElementById('preview');
  const readButton = document.getElementById('read');
  const pauseButton = document.getElementById('pause');
  const resumeButton = document.getElementById('resume');
  const stopButton = document.getElementById('stop');
  const rateInput = document.getElementById('rate');
  const pitchInput = document.getElementById('pitch');

  // 2. When "Detect" is clicked, inject the scripts and then send the "order"
  detectButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;

      // Use the Scripting API to inject the files
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

        chrome.tabs.sendMessage(tabId, { action: 'getText' });
      });
    });
  });

  // 3. Listen for the "finished dish" (clean text) from the Chef
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "setText") {
      // Put the clean text in the text area
      previewTextarea.value = request.text;
    }
  });

  // 4. Wire up the Text-to-Speech (TTS) buttons
  readButton.addEventListener('click', () => {
    const text = previewTextarea.value;
    if (text) {
      chrome.tts.stop(); // Stop any previous speech before starting a new one
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