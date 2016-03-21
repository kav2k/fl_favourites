var default_options = {
  branch_reorder_mode: "branch_reorder_active"
};

function reinjectContentScripts() {
  var contentScripts = [
    "js/lib/jquery.js",
    "js/lib/mutation-summary.js",
    "js/content.js"
  ];

  chrome.tabs.query({url: "*://fallenlondon.storynexus.com/Gap/Load*"}, function(tabs) {
    tabs.forEach(function(tab) {
      for (var file of contentScripts) {
        chrome.tabs.executeScript(tab.id, {file: file});
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(function() {
  // Set default options
  chrome.storage.sync.get(default_options, function(data) {
    chrome.storage.sync.set(data, function() {
      syncToLocal(reinjectContentScripts);
    });
  });
});

function syncToLocal(callback) {
  chrome.storage.sync.get(null, function(data) {
    chrome.storage.local.set(data, function() {
      if (callback) { callback(); }
    });
  });
}

function localToSync(callback) {
  syncTS = Date.now();
  clearTimeout(syncTimeout);
  chrome.storage.local.get(null, function(data) {
    chrome.storage.sync.set(data, function() {
      if (chrome.runtime.lastError) {
        console.error("Error syncing options: " + chrome.runtime.lastError.message);
      }
      if (callback) { callback(); }
    });
  });
}

var SYNC_PERIOD = 1000 * 3; // 3 seconds is safe for both syncing and event page lifetime
var syncTimeout;
var syncTS = 0;

chrome.storage.onChanged.addListener(function(changes, area) {
  if (area === "local") {
    if (Date.now() - syncTS > SYNC_PERIOD) {
      localToSync();
    } else {
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(localToSync, SYNC_PERIOD - (Date.now() - syncTS));
    }
  } else {
    syncToLocal();
  }
});
