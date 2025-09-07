// Use a flag to ensure the script is injected only once.
if (!window.contentScriptLoaded) {
  window.contentScriptLoaded = true;

  let selectionEnabled = false;

  // 1. Listen for the message from the popup to enter selection mode.
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "enterSelectionMode") {
      selectionEnabled = true;
      // Add a class to the body to give visual feedback (e.g., change cursor).
      document.body.classList.add('selection-mode-active');

      // Create a banner to inform the user they are in selection mode.
      const banner = document.createElement('div');
      banner.textContent = 'Selection Mode Active: Click and drag to select text.';
      banner.id = 'reading-extension-banner';
      document.body.appendChild(banner);
    }

    if (request.action === "clearHighlights") {
      // This can be used to clear any visual styles if needed in the future.
    }
  });

  // 2. Listen for the mouse up event to capture the selection.
  document.addEventListener('mouseup', (event) => {
    // Only act if selection mode is enabled.
    if (selectionEnabled) {
      const selectedText = window.getSelection().toString().trim();

      // 3. If text was selected, send it to the popup.
      if (selectedText) {
        chrome.runtime.sendMessage({
          action: "textSelected",
          text: selectedText
        });
      }

      // 4. Exit selection mode automatically after a selection is made.
      selectionEnabled = false;
      document.body.classList.remove('selection-mode-active');

      // Remove the banner.
      const banner = document.getElementById('reading-extension-banner');
      if (banner) {
        banner.remove();
      }
    }
  });
}
