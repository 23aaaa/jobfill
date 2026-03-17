chrome.action.onClicked.addListener((tab) => {
  if (!tab.url || !/^https?:\/\//.test(tab.url)) return;
  chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' }).catch(() => {});
});
