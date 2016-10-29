var branch_faves = new Set();
var storylet_faves = new Set();
var card_protects = new Set();
var card_discards = new Set();
var options = {};

/*var protect_timestamps = {};
var PROTECT_INTERVAL = 2000;*/

var observer;

loadData(registerObserver);
chrome.storage.onChanged.addListener(onStorageChange);

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
        fillClickHandlers(function() {
          parseStorylets(true);
          parseCards();
        });
      });
    },
    queries: [{element: ".storylet"}, {element: ".discard_btn"}]
  });
  fillClickHandlers(function() {
    parseStorylets(true);
    parseCards();
  });
}

// Gracefully shut down orphaned instance
function suicide() {
  console.warn("Playing Favourites " + version + " content script orphaned");
  observer.disconnect();
  window.removeEventListener("PlayingFavouritesLoad", suicide);
  chrome.storage.onChanged.removeListener(onStorageChange);
}

// Make inline click/submit handlers visible to the isolated world
function fillClickHandlers(callback) {
  let injected = function() {
    // Note: This executes in another context!
    // Note: This assumes jQuery in the other context!
    $("[onclick]").each(function() {
      this.dataset.onclick = this.attributes.onclick.value;
    });
    $("[onsubmit]").each(function() {
      this.dataset.onsubmit = this.attributes.onsubmit.value;
    });
    $("[onload]").each(function() {
      this.dataset.onload = this.attributes.onload.value;
    });
  };

  // Inject into the page context
  let s = document.createElement("script");
  s.textContent = "(" + injected + ")();";
  (document.head || document.documentElement).appendChild(s);
  s.parentNode.removeChild(s);
  callback();
}

function parseStorylets(reorder = false) { // Call without options to ensure no reordering
  let $container = $("#mainContentViaAjax");
  let $branches = $("#mainContentViaAjax > .storylet");
  let $storylets = $("#mainContentViaAjax .storylet-select");

  let reorder_active = false;
  let reorder_locked = false;
  if (reorder) {
    switch (options.branch_reorder_mode) {
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

  let $faves;
  let $anchor;
  $(".storylet_anchor").remove();

  if ($branches.length) {
    $anchor = $('<div class="storylet_anchor">');
    $branches.first().before($anchor);

    $branches.each(function() {
      let match = this.id.match(/branch(\d+)/);
      if (match) {
        const branchId = parseInt(match[1]);
        const active = $(this).hasClass("locked");

        $(this).find(".fave_toggle_button").remove();

        if ($(this).find(".go").prop("offsetParent") === null) { return; } // Fix for Protector extensions

        let $toggle_button = $('<input type="image" class="fave_toggle_button" title="Playing Favourites: toggle favourite">');
        $toggle_button.insertAfter($(this).find(".go"));
        $toggle_button.attr("data-active", active);
        $toggle_button.attr("data-branch-id", branchId);
        $toggle_button.click(branchToggle);

        if (branch_faves.has(branchId)) {
          $(this).addClass("storylet_favourite");
          $toggle_button.attr("src", chrome.runtime.getURL("img/button_filled.png"));
        } else {
          $(this).removeClass("storylet_favourite");
          $toggle_button.attr("src", chrome.runtime.getURL("img/button_empty.png"));
        }
      }
    });

    $faves = $branches.filter(".storylet_favourite");
  } else if ($storylets.length) {
    $anchor = $('<div class="storylet_anchor">');
    $storylets.first().before($anchor);

    $storylets.each(function() {
      let match;
      if ($(this).find(".go > input").attr("data-onclick")) {
        match = $(this).find(".go > input").attr("data-onclick").match(/beginEvent\((\d+)\)/);
      }

      if (match) {
        const storyletId = parseInt(match[1]);
        const active = $(this).hasClass("locked");

        $(this).find(".fave_toggle_button").remove();

        if ($(this).find(".go").prop("offsetParent") === null) { return; } // Fix for Protector extensions

        let $toggle_button = $('<input type="image" class="fave_toggle_button" title="Playing Favourites: toggle favourite">');
        $toggle_button.insertAfter($(this).find(".go"));
        $toggle_button.attr("data-active", active);
        $toggle_button.attr("data-storylet-id", storyletId);
        $toggle_button.click(storyletToggle);

        if (storylet_faves.has(storyletId)) {
          $(this).addClass("storylet_favourite");
          $toggle_button.attr("src", chrome.runtime.getURL("img/button_filled.png"));
        } else {
          $(this).removeClass("storylet_favourite");
          $toggle_button.attr("src", chrome.runtime.getURL("img/button_empty.png"));
        }
      }
    });

    $faves = $storylets.filter(".storylet_favourite");
  }

  if ($faves && reorder_locked) {
    $faves.filter(".locked").insertAfter($anchor);
  }

  if ($faves && reorder_active) {
    $faves.not(".locked").insertAfter($anchor);
  }
}

function parseCards() {
  let $discards = $("#mainContentViaAjax .discard_btn");

  $discards.each(function() {
    let match;
    if (this.dataset.onclick) {
      match = this.dataset.onclick.match(/eventid=(\d+)/);
    }

    if (match) {
      const cardId = parseInt(match[1]);

      $(this).next(".card_toggle_button").remove();

      if (this.offsetParent === null) { return; } // Fix for Protector extensions

      let $toggle_button = $('<input type="image" class="card_toggle_button" title="Playing Favourites: toggle favourite">');
      $toggle_button.insertAfter($(this));

      $toggle_button.attr("data-card-id", cardId);
      $(this).attr("data-card-id", cardId);

      $toggle_button.click(cardToggle);

      if (card_discards.has(cardId)) {
        $(this).addClass("card_discard");
        $(this).removeClass("card_protect");
        $toggle_button.attr("src", chrome.runtime.getURL("img/card_discard.png"));
      } else if (card_protects.has(cardId)) {
        $(this).removeClass("card_discard");
        $(this).addClass("card_protect");
        $toggle_button.attr("src", chrome.runtime.getURL("img/card_protect.png"));
      } else {
        $(this).removeClass("card_discard");
        $(this).removeClass("card_protect");
        $toggle_button.attr("src", chrome.runtime.getURL("img/card_empty.png"));
      }
    }
  });
}

function onStorageChange(changes, area) {
  if (area === "local") { loadData(parseStorylets); }
}

function loadData(callback) {
  chrome.storage.local.get(
    null,
    function(data) {
      branch_faves = unpackSet(data, "branch_faves");
      storylet_faves = unpackSet(data, "storylet_faves");
      card_protects = unpackSet(data, "card_protects");
      card_discards = unpackSet(data, "card_discards");

      options.branch_reorder_mode = data.branch_reorder_mode;
      options.switch_mode = data.switch_mode;

      if (callback) { callback(); }
    }
  );
}

function branchToggle(e) {
  e.preventDefault();

  const branchId = parseInt(this.dataset.branchId);

  if (branch_faves.has(branchId)) {
    removeBranchFave(branchId);
  } else {
    addBranchFave(branchId);
  }
}

function storyletToggle(e) {
  e.preventDefault();

  const storyletId = parseInt(this.dataset.storyletId);

  if (storylet_faves.has(storyletId)) {
    removeStoryletFave(storyletId);
  } else {
    addStoryletFave(storyletId);
  }
}

function cardToggle(e) {
  e.preventDefault();

  const cardId = parseInt(this.dataset.cardId);

  switch (options.switch_mode) {
    case "modifier_click":
      const modifier = (e.metaKey || e.ctrlKey);
      if (modifier) {
        if (card_protects.has(cardId)) {
          setCardFave(cardId, "none");
        } else {
          setCardFave(cardId, "protect");
        }
      } else {
        if (card_discards.has(cardId)) {
          setCardFave(cardId, "none");
        } else {
          setCardFave(cardId, "discard");
        }
      }
      break;
    case "click_through":
      if (card_discards.has(cardId)) {
        setCardFave(cardId, "protect");
      } else if (card_protects.has(cardId)) {
        setCardFave(cardId, "none");
      } else {
        setCardFave(cardId, "discard");
      }
      break;
  }
}

function saveFaves(callback) {
  let data = {};

  Object.assign(data, branch_faves.pack("branch_faves"));
  Object.assign(data, storylet_faves.pack("storylet_faves"));
  Object.assign(data, card_protects.pack("card_protects"));
  Object.assign(data, card_discards.pack("card_discards"));

  chrome.storage.local.set(data, function() {
    if (callback) { callback(); }
  });
}

function addBranchFave(branchId) {
  branch_faves.add(branchId);
  saveFaves(parseStorylets);
}

function removeBranchFave(branchId) {
  branch_faves.delete(branchId);
  saveFaves(parseStorylets);
}

function addStoryletFave(storyletId) {
  storylet_faves.add(storyletId);
  saveFaves(parseStorylets);
}

function removeStoryletFave(storyletId) {
  storylet_faves.delete(storyletId);
  saveFaves(parseStorylets);
}

function setCardFave(cardId, mode) {
  switch (mode) {
    case "none":
      card_discards.delete(cardId);
      card_protects.delete(cardId);
      break;
    case "protect":
      card_discards.delete(cardId);
      card_protects.add(cardId);
      break;
    case "discard":
      card_discards.add(cardId);
      card_protects.delete(cardId);
      break;
  }
  saveFaves(parseCards);
}
