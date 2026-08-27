(function () {
  "use strict";

  var form = document.getElementById("diagnostic-form");
  var output = document.getElementById("diagnostic-output");
  var status = document.getElementById("diagnostic-status");
  var copy = document.getElementById("copy-diagnostics");
  if (!form || !output || !status || !copy) return;
  var release = window.AKALYNTH_ANDROID_RELEASE || {
    version_name: "0.1.19-prod-v12",
    version_code: 2026082401,
  };

  function safeValue(name) {
    var field = form.elements.namedItem(name);
    return field && typeof field.value === "string" ? field.value.trim() : "";
  }

  function diagnostics() {
    return [
      "Akalynth safe diagnostics",
      "Version: " + release.version_name,
      "Build: " + release.version_code,
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
  document.addEventListener("akalynth:android-release", function (event) {
    if (!event.detail || typeof event.detail.version_name !== "string") return;
    release = event.detail;
    refresh();
  });
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
