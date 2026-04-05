const $ = id => document.getElementById(id);

async function updateStatus() {
  chrome.runtime.sendMessage({ type: "get_status" }, (res) => {
    if (!res) return;
    const active = res.polling && res.config.userId;
    $("dot").className = "dot" + (active ? "" : " off");
    $("statusText").textContent = active
      ? `Connected · ${res.config.serverUrl.replace("https://", "")}`
      : "Not connected";
    $("stopBtn").style.display = active ? "block" : "none";
    $("serverUrl").value = res.config.serverUrl || "https://aitaskflo.com";
    $("userId").value = res.config.userId || "";
    $("agentKey").value = res.config.agentKey || "";
  });
}

$("saveBtn").addEventListener("click", () => {
  const cfg = {
    serverUrl: $("serverUrl").value.trim().replace(/\/$/, "") || "https://aitaskflo.com",
    userId: $("userId").value.trim(),
    agentKey: $("agentKey").value.trim(),
  };
  if (!cfg.userId || !cfg.agentKey) {
    $("msg").textContent = "User ID and Agent Key required";
    $("msg").style.color = "#f87171";
    return;
  }
  chrome.runtime.sendMessage({ type: "save_config", config: cfg }, () => {
    $("msg").textContent = "✓ Connected!";
    $("msg").style.color = "#4ade80";
    setTimeout(updateStatus, 500);
  });
});

$("stopBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "stop" }, () => {
    $("msg").textContent = "Agent stopped";
    $("msg").style.color = "#94a3b8";
    updateStatus();
  });
});

updateStatus();
