//When the extention icon is clicked.

// A variable to store the window ID, so we can avoid opening multiple windows.
let panelWindowId = null;

// Listen for a click on the extension's icon.
chrome.action.onClicked.addListener((tab) => {
  // ID of the tab where the user clicked the icon.
  const tabId = tab.id;

  // If the window already exists, focus it.
  if (panelWindowId !== null) {
    chrome.windows.get(panelWindowId, {}, (existingWindow) => {
      if (chrome.runtime.lastError) {
        // The window was closed, so we'll create a new one.
        createPanel(tabId);
      } else {
        // The window exists, bring it to the front.
        chrome.windows.update(panelWindowId, { focused: true });
      }
    });
  } else {
    // Otherwise, create a new window.
    createPanel(tabId);
  }
});

function createPanel(tabId) {
  // Append the tabId to the URL as a query parameter.
  const urlWithTabId = `popup.html?tabId=${tabId}`;

  chrome.windows.create({
    url: urlWithTabId,
    type: 'popup', 
    width: 400,
    height: 450,
  }, (window) => {
    panelWindowId = window.id;

    // When the user closes our window, we need to reset the window ID.
    const onRemovedListener = (closedWindowId) => {
      if (closedWindowId === panelWindowId) {
        panelWindowId = null;
        chrome.windows.onRemoved.removeListener(onRemovedListener);
      }
    };
    chrome.windows.onRemoved.addListener(onRemovedListener);
  });
}