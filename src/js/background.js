var default_options = {
  branch_reorder_mode: "branch_reorder_active",
  switch_mode: "click_through",

  branch_fave_array: [],
  storylet_fave_array: [],
  card_protect_array: [],
  card_discard_array: [],

  storage_schema: 1
};

// Inject into open tabs on launch
function reinjectContentScripts() {
  var stylesheets = [
    "css/content.css"
  ];
  var contentScripts = [
    "js/lib/jquery.js",
    "js/lib/mutation-summary.js",
    "js/content.js"
  ];

  chrome.tabs.query({url: "*://fallenlondon.storynexus.com/Gap/Load*"}, function(tabs) {
    function silence() {
      if (chrome.runtime.lastError) { /* silence access errors */ }
    }

    tabs.forEach(function(tab) {
      var file;
      for (file of stylesheets) {
        chrome.tabs.insertCSS(tab.id, {file: file}, silence);
      }
      for (file of contentScripts) {
        chrome.tabs.executeScript(tab.id, {file: file, runAt: "document_end"}, silence);
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(function() {
  // Set default options
  chrome.storage.sync.get(default_options, function(data) {
    switch (data.storage_schema) {
      case 0:
        chrome.storage.sync.get(["branch_faves", "branch_fave_array"], function(more_data) {
          if (more_data.branch_faves) {
            data.branch_fave_array = more_data.branch_faves;
            data.storage_schema = 1;
            chrome.storage.sync.set(data, function() {
              syncToLocal(reinjectContentScripts);
            });
          }
        });
        return;
    }

    chrome.storage.sync.set(data, function() {
      syncToLocal(reinjectContentScripts);
    });
  });
});
// Dealing with chrome.storage.sync rate limiting
var SYNC_PERIOD = 1000 * 3; // 3 seconds is safe for both syncing and event page lifetime
var syncTimeout;
var syncTS = 0;

function syncToLocal(callback) {
  chrome.storage.sync.get(null, function(data) {
    chrome.storage.local.set(data, function() {
      if (callback) { callback(); }
    });
  });
}

function localToSync(callback) {
  // Set time of last sync write for rate limiting
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

chrome.storage.onChanged.addListener(function(changes, area) {
  if (area === "local") { // Changes to local values, must commit to sync
    if (Date.now() - syncTS > SYNC_PERIOD) {
      localToSync();
    } else { // Schedule a write SYNC_PERIOD after last sync write
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(localToSync, SYNC_PERIOD - (Date.now() - syncTS));
    }
  } else { // Changes coming from sync, must commit to local
    syncToLocal();
  }
});
