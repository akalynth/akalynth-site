(function () {
  "use strict";

  var form = document.getElementById("diagnostic-form");
  var output = document.getElementById("diagnostic-output");
  var status = document.getElementById("diagnostic-status");
  var copy = document.getElementById("copy-diagnostics");
  if (!form || !output || !copy) return;

  function safeValue(name) {
    var field = form.elements.namedItem(name);
    return field && typeof field.value === "string" ? field.value.trim() : "";
  }

  function diagnostics() {
    return [
      "Akalynth safe diagnostics",
      "Version: 0.1.19-prod-v12",
      "Build: 2026082401",
      "Supported Android: 8.0+ (API 26+)",
      "Page: " + location.pathname.split("/").pop(),
      "Device model: " + (safeValue("device") || "not provided"),
      "Android version: " + (safeValue("android") || "not provided"),
      "Issue category: " + safeValue("category"),
    ].join("\n");
  }

  function refresh() {
    output.value = diagnostics();
  }

  form.addEventListener("input", refresh);
  copy.addEventListener("click", function () {
    refresh();
    var write = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(output.value)
      : Promise.reject(new Error("clipboard_unavailable"));
    write.then(function () {
      status.textContent = "Safe diagnostics copied. No message was sent.";
    }).catch(function () {
      output.focus();
      output.select();
      status.textContent = "Clipboard access was unavailable. The safe text is selected for manual copy.";
    });
  });
  refresh();
})();
