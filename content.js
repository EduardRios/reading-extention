chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // 2. Check if the order is to "getText"
  if (request.action === "getText") {

    // 3. Use the Readability.js tool on a *copy* of the page
    const documentClone = document.cloneNode(true);
    const article = new Readability(documentClone).parse();

    // 4. Send the clean text back to the Waiter (popup.js)
    if (article && article.textContent) {
      chrome.runtime.sendMessage({
        action: "setText",
        text: article.textContent
      });
    }
  }
});
