var branch_faves = new Set();
var options = {};

var observer;

loadData(registerObserver);

var event = new CustomEvent("PlayingFavouritesLoad");
window.dispatchEvent(event);

window.addEventListener("PlayingFavouritesLoad", suicide, false);

var version = chrome.runtime.getManifest().version;
console.log("Playing Favourites " + version + " injected");

// -----------------

function registerObserver() {
  observer = new MutationSummary({
    rootNode: document.getElementById("mainContentViaAjax"),
    callback: function(summaries) {
      summaries.forEach(function(summary) {
        parseStorylets(options);
      });
    },
    queries: [{element: ".storylet"}]
  });
  parseStorylets(options);
}

function suicide() {
  console.warn("Playing Favourites " + version + " content script orphaned");
  observer.disconnect();
  window.removeEventListener("PlayingFavouritesLoad", suicide);
}

function parseStorylets(reorder_options) {
  var $container = $("#mainContentViaAjax");
  var $storylets = $("#mainContentViaAjax > .storylet");

  $(".storylet_anchor").remove();
  var $anchor = $('<div class="storylet_anchor">');
  $storylets.first().before($anchor);

  var reorder_active = false;
  var reorder_locked = false;
  if (reorder_options) {
    switch (reorder_options.branch_reorder_mode) {
      case "branch_no_reorder":
        break;
      case "branch_reorder_active":
        reorder_active = true;
        break;
      case "branch_reorder_all":
        reorder_active = true;
        reorder_locked = true;
        break;
    }
  }

  $storylets.each(function() {
    var match = this.id.match(/branch(\d+)/);
    if (match) {
      var branchId = parseInt(match[1]);
      var active = $(this).hasClass("locked");

      $(this).find(".fave_toggle_button").remove();

      var $toggle_button = $('<input type="image" class="fave_toggle_button" title="Playing Favourites: toggle favourite">');
      $toggle_button.insertAfter($(this).find(".go"));
      $toggle_button.attr("data-active", active);
      $toggle_button.attr("data-branch-id", branchId);
      $toggle_button.click(clickToggle);

      if (branch_faves.has(branchId)) {
        $(this).addClass("storylet_favourite");
        $toggle_button.attr("src", chrome.runtime.getURL("img/button_filled.png"));
      } else {
        $(this).removeClass("storylet_favourite");
        $toggle_button.attr("src", chrome.runtime.getURL("img/button_empty.png"));
      }
    }
  });

  var $faves = $storylets.filter(".storylet_favourite");

  var $flavour = $container.find(".storylet_flavour_text");

  if (reorder_locked) {
    $faves.filter(".locked").insertAfter($anchor);
  }

  if (reorder_active) {
    $faves.not(".locked").insertAfter($anchor);
  }
}

chrome.storage.onChanged.addListener(function(changes, area) {
  if (area === "local") { loadData(parseStorylets); }
});

function loadData(callback) {
  chrome.storage.local.get(
    null,
    function(data) {
      branch_faves = new Set(data.branch_faves || []);

      options.branch_reorder_mode = data.branch_reorder_mode;

      if (callback) { callback(); }
    }
  );
}

function clickToggle(e) {
  e.preventDefault();

  var branchId = parseInt(this.dataset.branchId);

  if (branch_faves.has(branchId)) {
    removeFave(branchId);
  } else {
    addFave(branchId);
  }
}

function saveFaves(callback) {
  var fave_array = [];
  var key;
  for (key of branch_faves.keys()) {
    fave_array.push(key);
  }
  chrome.storage.local.set({branch_faves: fave_array}, function() {
    if (callback) { callback(); }
  });
}

function addFave(branchId) {
  branch_faves.add(branchId);
  saveFaves(parseStorylets);
}

function removeFave(branchId) {
  branch_faves.delete(branchId);
  saveFaves(parseStorylets);
}
