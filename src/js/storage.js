// Set <-> extension storage conversion

const MAX_MAP_ITEMS_PER_KEY = 512;

Set.prototype.pack = function(storage_key) {
  let source = Array.from(this).sort();
  let total = source.length;
  let keys = [];
  let result = {};
  
  for (let index = 0; index * MAX_MAP_ITEMS_PER_KEY < total; index++) {
    result[`${storage_key}_${index}`] = source.slice(
      index * MAX_MAP_ITEMS_PER_KEY,
      (index + 1) * MAX_MAP_ITEMS_PER_KEY
    );
    keys.push(`${storage_key}_${index}`);
  }

  result[`${storage_key}_keys`] = keys;
  return result;
};

function unpackSet(data, storage_key) {
  let result = new Set();
  if (Array.isArray(data[`${storage_key}_keys`])) {
    for (var key of data[`${storage_key}_keys`]) {
       result = new Set([...result, ...data[key]]);
    }
  }
  return result;
}

// Storage interfaces

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

function getOption(key) {
  return new Promise((resolve, reject) => {
    if (key in default_options) {
      chrome.storage.local.get({[key]: default_options[key]}, (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data[key]);
        }
      })
    } else {
      chrome.storage.local.get(key, (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data[key]);
        }
      })
    }
  });
}

function setOption(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({[key]: value}, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    })
  });
}

function getOptions() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (all_data) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        chrome.storage.local.get(default_options, function(data_overlay) {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            Object.assign(all_data, data_overlay);
            resolve(all_data);
          }
        });
      }
    })
  });
}

function setOptions(data) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    })
  });
}
