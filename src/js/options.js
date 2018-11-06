$(document).ready(function() {
  $("input[type=radio]").each(async function() {
    let el = this;
    let value = await getOption(el.name);
    el.checked = (value === el.value);
  }).change(async function() {
    if (this.checked) {
      await setOption(this.name, this.value);
    }
  });

  $("input[type=checkbox]").each(async function() {
    let el = this;
    let checked = await getOption(el.value);
    el.checked = checked;
  }).change(async function() {
    await setOption(this.value, this.checked);
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
