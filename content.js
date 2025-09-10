// Use a flag to ensure the script is injected only once.
if (!window.contentScriptLoaded) {
  window.contentScriptLoaded = true;

  let selectionEnabled = false;
  const HIGHLIGHT_CLASS = 'reading-extension-selection-highlight';
  const ACTIVE_WORD_CLASS = 'reading-extension-active-word';

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

  function clearActiveWordHighlight() {
    const activeWord = document.querySelector(`span.${ACTIVE_WORD_CLASS}`);
    if (activeWord) {
        const parent = activeWord.parentNode;
        if (parent) {
            while (activeWord.firstChild) {
                parent.insertBefore(activeWord.firstChild, activeWord);
            }
            parent.removeChild(activeWord);
            parent.normalize();
        }
    }
  }

  function handleHighlightWord(charIndex) {
      clearActiveWordHighlight();

      const highlights = document.querySelectorAll(`span.${HIGHLIGHT_CLASS}`);
      if (highlights.length === 0) return;

      let currentLength = 0;
      let found = false;

      const textNodes = [];
      highlights.forEach(h => {
          const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
          let node;
          while(node = walker.nextNode()) {
              textNodes.push(node);
          }
      });

      for (const node of textNodes) {
          const text = node.nodeValue;
          const nextLength = currentLength + text.length;

          if (!found && charIndex >= currentLength && charIndex < nextLength) {
              const startIndex = charIndex - currentLength;
              
              let endIndex = text.indexOf(' ', startIndex);
              if (endIndex === -1) {
                  endIndex = text.length;
              }

              if (text.substring(startIndex, endIndex).trim() === '') {
                  currentLength = nextLength;
                  continue;
              }

              const range = document.createRange();
              range.setStart(node, startIndex);
              range.setEnd(node, endIndex);

              const span = document.createElement('span');
              span.className = ACTIVE_WORD_CLASS;
              
              try {
                  range.surroundContents(span);
                  found = true;
              } catch (e) {
                  console.error("Reading Extension Error: Could not highlight word.", e);
              }
          }

          if (found) break;
          currentLength = nextLength;
      }
  }

  // Listen for messages from the popup.
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "enterSelectionMode") {
      // Clear any existing highlights as soon as we enter selection mode.
      clearHighlights();
      clearActiveWordHighlight();

      selectionEnabled = true;
      document.body.classList.add('selection-mode-active');

      const banner = document.createElement('div');
      banner.textContent = 'Selection Mode Active: Click and drag to select text.';
      banner.id = 'reading-extension-banner';
      document.body.appendChild(banner);
    }

    if (request.action === "clearHighlights") {
      clearHighlights();
      clearActiveWordHighlight();
    }

    if (request.action === "highlightWord") {
      handleHighlightWord(request.charIndex);
    }

    if (request.action === "clearWordHighlight") {
      clearActiveWordHighlight();
    }
  });

  //Listen for the mouse up event to capture and highlight the selection.
  document.addEventListener('mouseup', (event) => {
    if (selectionEnabled) {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      clearHighlights();

      if (selectedText) {
        try {
          const selection = window.getSelection();
          const range = selection.getRangeAt(0);

          // This new function highlights the range carefully by walking the DOM backwards.
          function highlightRange(range) {
            let root = range.commonAncestorContainer;
            if (root.nodeType === Node.TEXT_NODE) {
              root = root.parentNode;
            }
            const walker = document.createTreeWalker(
              root,
              NodeFilter.SHOW_TEXT,
              { acceptNode: node => range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
            );
            const nodes = [];
            while(walker.nextNode()) {
                if (walker.currentNode.textContent.trim() !== '') {
                    nodes.push(walker.currentNode);
                }
            }

            for (let i = nodes.length - 1; i >= 0; i--) {
                const node = nodes[i];
                const span = document.createElement('span');
                span.className = HIGHLIGHT_CLASS;

                const nodeRange = document.createRange();

                // Case 1: The node is the start and end of the selection
                if (node === range.startContainer && node === range.endContainer) {
                    nodeRange.setStart(node, range.startOffset);
                    nodeRange.setEnd(node, range.endOffset);
                    nodeRange.surroundContents(span);
                }
                // Case 2: The node is the end of the selection
                else if (node === range.endContainer) {
                    nodeRange.setStart(node, 0);
                    nodeRange.setEnd(node, range.endOffset);
                    nodeRange.surroundContents(span);
                }
                // Case 3: The node is the start of the selection
                else if (node === range.startContainer) {
                    nodeRange.setStart(node, range.startOffset);
                    nodeRange.setEnd(node, node.length);
                    nodeRange.surroundContents(span);
                }
                // Case 4: The node is fully contained within the selection
                else {
                    nodeRange.selectNode(node);
                    nodeRange.surroundContents(span);
                }
            }
          }

          if (!range.collapsed) {
            highlightRange(range);
          }

          // Always send the selected text.
          chrome.runtime.sendMessage({
            action: "textSelected",
            text: selectedText
          });

        } catch (e) {
          console.error("Reading Extension Error: Could not process the selection.", e);
          // Still send the text even if highlighting fails.
          chrome.runtime.sendMessage({
            action: "textSelected",
            text: selectedText
          });
        }
      }

      //Exit selection mode automatically.
      selectionEnabled = false;
      document.body.classList.remove('selection-mode-active');
      const banner = document.getElementById('reading-extension-banner');
      if (banner) {
        banner.remove();
      }
    }
  });
}