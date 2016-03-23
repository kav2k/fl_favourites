var branch_faves = new Set();
var card_protects = new Set();
var card_discards = new Set();
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
        fillClickHandlers(function() {
          parseStorylets(options);
          parseCards(options);
        });
      });
    },
    queries: [{element: ".storylet"}, {element: ".discard_btn"}]
  });
  parseStorylets(options);
  parseCards(options);
}

function suicide() {
  console.warn("Playing Favourites " + version + " content script orphaned");
  observer.disconnect();
  window.removeEventListener("PlayingFavouritesLoad", suicide);
}

// Make inline click/submit handlers visible to the isolated world
function fillClickHandlers(callback) {
  var injected = function() {
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

  var s = document.createElement("script");
  s.textContent = "(" + injected + ")();";
  (document.head || document.documentElement).appendChild(s);
  s.parentNode.removeChild(s);
  callback();
}

function parseStorylets(storylet_options) {
  var $container = $("#mainContentViaAjax");
  var $storylets = $("#mainContentViaAjax > .storylet");

  $(".storylet_anchor").remove();
  var $anchor = $('<div class="storylet_anchor">');
  $storylets.first().before($anchor);

  var reorder_active = false;
  var reorder_locked = false;
  if (storylet_options) {
    switch (storylet_options.branch_reorder_mode) {
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
      $toggle_button.click(storyletToggle);

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

function parseCards(card_options) {
  var $discards = $("#mainContentViaAjax .discard_btn");

  $discards.each(function() {
    var match = this.dataset.onclick.match(/eventid=(\d+)/);

    if (match) {
      var cardId = parseInt(match[1]);

      $(this).next(".card_toggle_button").remove();
      var $toggle_button = $('<input type="image" class="card_toggle_button" title="Playing Favourites: toggle favourite">');
      $toggle_button.insertAfter($(this));

      $toggle_button.attr("data-card-id", cardId);

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

chrome.storage.onChanged.addListener(function(changes, area) {
  if (area === "local") { loadData(parseStorylets); }
});

function loadData(callback) {
  chrome.storage.local.get(
    null,
    function(data) {
      branch_faves = new Set(data.branch_fave_array || []);
      card_protects = new Set(data.card_protect_array || []);
      card_discards = new Set(data.card_discard_array || []);

      options.branch_reorder_mode = data.branch_reorder_mode;

      if (callback) { callback(); }
    }
  );
}

function storyletToggle(e) {
  e.preventDefault();

  var branchId = parseInt(this.dataset.branchId);

  if (branch_faves.has(branchId)) {
    removeBranchFave(branchId);
  } else {
    addBranchFave(branchId);
  }
}

function cardToggle(e) {
  e.preventDefault();

  var cardId = parseInt(this.dataset.cardId);

  if (card_discards.has(cardId)) {
    setCardFave(cardId, "protect");
  } else if (card_protects.has(cardId)) {
    setCardFave(cardId, "none");
  } else {
    setCardFave(cardId, "discard");
  }
  /*if (card_faves.has(branchId)) {
    removeFave(branchId);
  } else {
    addFave(branchId);
  }*/
}

function saveFaves(callback) {
  var branch_fave_array = [];
  var card_protect_array = [];
  var card_discard_array = [];
  var key;
  for (key of branch_faves.keys()) {
    branch_fave_array.push(key);
  }
  for (key of card_protects.keys()) {
    card_protect_array.push(key);
  }
  for (key of card_discards.keys()) {
    card_discard_array.push(key);
  }
  chrome.storage.local.set(
    {
      branch_fave_array: branch_fave_array,
      card_protect_array: card_protect_array,
      card_discard_array: card_discard_array
    }, function() {
      if (callback) { callback(); }
    }
  );
}

function addBranchFave(branchId) {
  branch_faves.add(branchId);
  saveFaves(parseStorylets);
}

function removeBranchFave(branchId) {
  branch_faves.delete(branchId);
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

