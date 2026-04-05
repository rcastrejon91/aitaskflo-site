/**
 * Lyra Agent — Content Script
 * Shows a subtle indicator when Lyra is actively controlling this tab.
 */

let indicator = null;

function showIndicator(text) {
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.style.cssText = `
      position: fixed; bottom: 16px; left: 16px; z-index: 2147483647;
      background: rgba(139,92,246,0.92); backdrop-filter: blur(8px);
      border: 1px solid rgba(139,92,246,0.6); border-radius: 20px;
      color: white; font-size: 12px; font-family: system-ui, sans-serif;
      padding: 6px 14px; display: flex; align-items: center; gap: 8px;
      box-shadow: 0 4px 20px rgba(139,92,246,0.4);
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    document.body.appendChild(indicator);
  }
  indicator.innerHTML = `
    <span style="width:7px;height:7px;border-radius:50%;background:#4ade80;display:inline-block;animation:lyra-pulse 1s infinite"></span>
    <span>Lyra is working…${text ? " · " + text : ""}</span>
  `;
  indicator.style.opacity = "1";

  if (!document.querySelector("#lyra-pulse-style")) {
    const style = document.createElement("style");
    style.id = "lyra-pulse-style";
    style.textContent = `@keyframes lyra-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }`;
    document.head.appendChild(style);
  }
}

function hideIndicator() {
  if (indicator) {
    indicator.style.opacity = "0";
    setTimeout(() => { indicator?.remove(); indicator = null; }, 400);
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "lyra_working") showIndicator(msg.text);
  if (msg.type === "lyra_done") hideIndicator();
});
