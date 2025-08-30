if (!window.contentScriptLoaded) {
  window.contentScriptLoaded = true;

  // Helper function to remove existing highlights and IDs
  const clearHighlights = () => {
    // Remove highlight class from all elements
    const highlightedElements = document.querySelectorAll('.reading-extension-highlight');
    highlightedElements.forEach(el => el.classList.remove('reading-extension-highlight'));

    // Clean up the temporary IDs from all elements
    const taggedElements = document.querySelectorAll('[data-reading-id]');
    taggedElements.forEach(el => el.removeAttribute('data-reading-id'));
  }; 

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "highlightText") {
      //Clear any previous highlights
      clearHighlights();

      // Tag all elements with a unique ID
      let elementIdCounter = 0;
      document.body.querySelectorAll('*').forEach(el => {
        el.setAttribute('data-reading-id', ++elementIdCounter);
      });

      //Clone the tagged document and parse with Readability
      const documentClone = document.cloneNode(true);
      const article = new Readability(documentClone).parse();

      if (article && article.content) {
        //Parse the article HTML to find the IDs
        const parser = new DOMParser();
        const articleDoc = parser.parseFromString(article.content, 'text/html');
        const articleElementsWithId = articleDoc.querySelectorAll('[data-reading-id]');
        const idsToHighlight = Array.from(articleElementsWithId).map(el => el.getAttribute('data-reading-id'));

        //Highlight  elements on page
        idsToHighlight.forEach(id => {
          const elementToHighlight = document.querySelector(`[data-reading-id="${id}"]`);
          if (elementToHighlight) {
            elementToHighlight.classList.add('reading-extension-highlight');
          }
        });

        // Send the clean text to popup
        chrome.runtime.sendMessage({
          action: "setText",
          text: article.textContent
        });
      }
    }

    if (request.action === "clearHighlights") {
      clearHighlights();
    }
  });
}