$(document).ready(function() {
  $("input[type=radio]").each(function() {
    var el = this;
    chrome.storage.local.get(el.name, function(data) {
      console.log("Load: ", data);
      el.checked = (data[el.name] === el.value);
    });
  }).change(function() {
    var data = {};
    if (this.checked) {
      data[this.name] = this.value;
    }
    console.log("Save: ", data);
    chrome.storage.local.set(data);
  });

  $("input[type=checkbox]").each(function() {
    var el = this;
    chrome.storage.local.get(el.value, function(data) {
      console.log("Load: ", data);
      el.checked = data[el.value];
    });
  }).change(function() {
    var data = {};
    data[this.value] = this.checked;
    console.log("Save: ", data);
    chrome.storage.local.set(data);
  });

  $.ajax("changelog.txt").done(function(text) {
    $("#changelogText").text(text);
  });

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
