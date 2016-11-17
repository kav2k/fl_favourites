$(document).ready(function() {
  $("input[type=radio]").each(function() {
    let el = this;
    chrome.storage.local.get(el.name, function(data) {
      el.checked = (data[el.name] === el.value);
    });
  }).change(function() {
    let data = {};
    if (this.checked) {
      data[this.name] = this.value;
    }
    chrome.storage.local.set(data);
  });

  $("input[type=checkbox]").each(function() {
    let el = this;
    chrome.storage.local.get(el.value, function(data) {
      el.checked = data[el.value];
    });
  }).change(function() {
    let data = {};
    data[this.value] = this.checked;
    chrome.storage.local.set(data);
  });

  $.ajax("/changelog.txt", {dataType: "text"}).done(function(text) {
    $("#changelogText").text(text);
  });

  if (window.browser) { // Firefox
    $("#rate_chrome").hide();
  }

  $("#optionsContainer").show();

  $("#changelogLink").click(function() {
    $(".container").not("#changelogContainer").hide();
    $("#changelogContainer").show();
    $("#changelogLink").hide();
    $("#changelogHideLink").show();
  });

  $("#changelogHideLink").click(function() {
    $(".container").not("#optionsContainer").hide();
    $("#optionsContainer").show();
    $("#changelogLink").show();
    $("#changelogHideLink").hide();
  });
});
