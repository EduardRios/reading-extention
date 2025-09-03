if (!window.contentScriptLoaded) {
  window.contentScriptLoaded = true;

  // Helper function to remove all modifications
  const clearAll = () => {
    document.querySelectorAll('.reading-extension-highlight').forEach(el => el.classList.remove('reading-extension-highlight'));
    document.querySelectorAll('.reading-extension-ignored').forEach(el => el.classList.remove('reading-extension-ignored'));
    document.querySelectorAll('.reading-extension-delete-btn').forEach(btn => btn.remove());
    document.querySelectorAll('[data-reading-id]').forEach(el => el.removeAttribute('data-reading-id'));
  };

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "highlightText") {
      clearAll();

      let elementIdCounter = 0;
      document.body.querySelectorAll('*').forEach(el => {
        // Only tag elements that are visible and not scripts/styles
        if (el.offsetParent !== null && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
          el.setAttribute('data-reading-id', ++elementIdCounter);
        }
      });

      //Clone the tagged document and parse with Readability
      const documentClone = document.cloneNode(true);
      const article = new Readability(documentClone).parse();

      if (article && article.content) {
        const parser = new DOMParser();
        const articleDoc = parser.parseFromString(article.content, 'text/html');
        const articleElementsWithId = articleDoc.querySelectorAll('[data-reading-id]');
        const idsToHighlight = Array.from(articleElementsWithId).map(el => el.getAttribute('data-reading-id'));

        const elementsToRead = [];

        idsToHighlight.forEach(id => {
          const elementToHighlight = document.querySelector(`[data-reading-id="${id}"]`);
          // Ensure element exists and has meaningful text content
          if (elementToHighlight && elementToHighlight.textContent.trim().length > 10) {
            elementToHighlight.classList.add('reading-extension-highlight');

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'X';
            deleteBtn.className = 'reading-extension-delete-btn';
            deleteBtn.title = 'Do not read this section';
            
            deleteBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();

              elementToHighlight.classList.remove('reading-extension-highlight');
              elementToHighlight.classList.add('reading-extension-ignored');
              deleteBtn.remove(); // Remove the button after click

              chrome.runtime.sendMessage({
                action: "removeTextById",
                idToRemove: id
              });
            });

            elementToHighlight.appendChild(deleteBtn);

            elementsToRead.push({
              id: id,
              text: elementToHighlight.textContent.replace(/X$/, '').trim()
            });
          }
        });

        chrome.runtime.sendMessage({
          action: "setTextElements",
          elements: elementsToRead
        });
      }
    }

    if (request.action === "clearHighlights") {
      clearAll();
    }
  });
}
