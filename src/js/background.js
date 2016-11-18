var default_options = {
  branch_reorder_mode: "branch_reorder_active",
  switch_mode: "click_through",

  branch_faves_keys: [],
  branch_avoids_keys: [],
  storylet_faves_keys: [],
  storylet_avoids_keys: [],
  card_protects_keys: [],
  card_discards_keys: [],

  storage_schema: 2
};

// Inject into open tabs on launch
function reinjectContentScripts() {
  let stylesheets = [
    "/css/content.css"
  ];
  let contentScripts = [
    "/js/lib/jquery.js",
    "/js/lib/mutation-summary.js",
    "/js/set_pack.js",
    "/js/content.js"
  ];

  chrome.tabs.query({url: "*://fallenlondon.storynexus.com/Gap/Load*"}, function(tabs) {
    if (chrome.runtime.lastError) {
      // Assume Firefox (does not allow query with URL)
      return; // Do nothing: FF reinjects content scripts on load anyway
    }

    tabs.forEach(function(tab) {
      for (let file of stylesheets) {
        chrome.tabs.insertCSS(tab.id, {file: file});
      }
      for (let file of contentScripts) {
        chrome.tabs.executeScript(tab.id, {file: file, runAt: "document_end"});
      }
    });
  });
}

if (chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(init);
} else { // Jeez, Firefox, really? NOT IMPLEMENTED https://bugzilla.mozilla.org/show_bug.cgi?id=1252871
  init(true);
}

function init(avoidSync = false) {
  const storage = (avoidSync) ? chrome.storage.local : chrome.storage.sync;
  storage.get(default_options, function(data) {
    switch (data.storage_schema) {
      case 0: // Rename saved array in storage
        storage.get(["branch_faves", "branch_fave_array"], function(more_data) {
          if (more_data.branch_faves) {
            data.branch_fave_array = more_data.branch_faves;
            data.storage_schema = 1;
            storage.set(data, function() {
              syncToLocal(reinjectContentScripts);
            });
          }
        });
        return;
      case 1: // Migrate from saved arrays to packed sets
        storage.get([
          "branch_fave_array",
          "storylet_fave_array",
          "card_protect_array",
          "card_discard_array"
        ], function(data) {
          Object.assign(data, new Set(data.branch_fave_array).pack("branch_faves"));
          Object.assign(data, new Set(data.storylet_fave_array).pack("storylet_faves"));
          Object.assign(data, new Set(data.card_protect_array).pack("card_protects"));
          Object.assign(data, new Set(data.card_discard_array).pack("card_discards"));
          data.storage_schema = 2;
          storage.set(data, function() {
            syncToLocal(reinjectContentScripts);
          });
        });
    }

    storage.set(data, function() {
      syncToLocal(reinjectContentScripts);
    });
  });
}

// Dealing with chrome.storage.sync rate limiting
const SYNC_PERIOD = 1000 * 3; // 3 seconds is safe for both syncing and event page lifetime
var syncTimeout;
var syncTS = 0;

function syncToLocal(callback) {
  if (!chrome.storage.sync) { // Firefox: NOT IMPLEMENTED https://bugzilla.mozilla.org/show_bug.cgi?id=1220494
    if (callback) { callback(); }
    return;
  }

  chrome.storage.sync.get(null, function(data) {
    chrome.storage.local.set(data, function() {
      if (callback) { callback(); }
    });
  });
}

function localToSync(callback) {
  if (!chrome.storage.sync) { // Firefox: NOT IMPLEMENTED https://bugzilla.mozilla.org/show_bug.cgi?id=1220494
    if (callback) { callback(); }
    return;
  }
  
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
