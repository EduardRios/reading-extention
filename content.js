// Use a flag to ensure the script is injected only once.
if (!window.contentScriptLoaded) {
  window.contentScriptLoaded = true;

  let selectionEnabled = false;
  const HIGHLIGHT_CLASS = 'reading-extension-selection-highlight';

  // Clears highlights by finding our specific spans and unwrapping them.
  function clearHighlights() {
    const highlights = document.querySelectorAll(`span.${HIGHLIGHT_CLASS}`);
    highlights.forEach(node => {
      const parent = node.parentNode;
      if (parent) {
        // Replace the span with its own child nodes.
        while (node.firstChild) {
          parent.insertBefore(node.firstChild, node);
        }
        parent.removeChild(node);
        parent.normalize(); // Clean up adjacent text nodes.
      }
    });
  }

  // 1. Listen for messages from the popup.
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "enterSelectionMode") {
      selectionEnabled = true;
      document.body.classList.add('selection-mode-active');

      const banner = document.createElement('div');
      banner.textContent = 'Selection Mode Active: Click and drag to select text.';
      banner.id = 'reading-extension-banner';
      document.body.appendChild(banner);
    }

    if (request.action === "clearHighlights") {
      clearHighlights();
    }
  });

  // 2. Listen for the mouse up event to capture and highlight the selection.
  document.addEventListener('mouseup', (event) => {
    if (selectionEnabled) {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      clearHighlights();

      if (selectedText) {
        try {
          const range = window.getSelection().getRangeAt(0);

          // Create a temporary copy of the selection to check its contents.
          const tempFragment = range.cloneContents();
          const hasBlockElements = tempFragment.querySelector('p, h1, h2, h3, h4, h5, h6, div, li, blockquote, pre, table');

          // To guarantee stability, only highlight simple selections that don't contain block elements.
          if (!hasBlockElements) {
            const highlightSpan = document.createElement('span');
            highlightSpan.className = HIGHLIGHT_CLASS;
            const selectedFragment = range.extractContents();
            highlightSpan.appendChild(selectedFragment);
            range.insertNode(highlightSpan);
          }

          // Always send the selected text, even if highlighting was skipped for safety.
          chrome.runtime.sendMessage({
            action: "textSelected",
            text: selectedText
          });
        } catch (e) {
          console.error("Reading Extension Error: Could not process the selection.", e);
          chrome.runtime.sendMessage({
            action: "textSelected",
            text: selectedText
          });
        }
      }

      // 4. Exit selection mode automatically.
      selectionEnabled = false;
      document.body.classList.remove('selection-mode-active');
      const banner = document.getElementById('reading-extension-banner');
      if (banner) {
        banner.remove();
      }
    }
  });
}