/**
 * Lyra Agent — Background Service Worker
 * Polls the server for tasks and executes them in the active tab.
 */

const POLL_INTERVAL = 2000; // ms
let polling = false;
let config = { serverUrl: "https://aitaskflo.com", userId: "", agentKey: "" };

// ── Load config from storage ──────────────────────────────────────────────────

async function loadConfig() {
  const stored = await chrome.storage.local.get(["serverUrl", "userId", "agentKey"]);
  config = {
    serverUrl: stored.serverUrl || "https://aitaskflo.com",
    userId: stored.userId || "",
    agentKey: stored.agentKey || "",
  };
}

// ── Take screenshot of active tab ─────────────────────────────────────────────

async function captureTab() {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png", quality: 80 });
    // Strip data:image/png;base64, prefix
    return dataUrl.replace(/^data:image\/png;base64,/, "");
  } catch {
    return null;
  }
}

// ── Execute action in active tab ─────────────────────────────────────────────

async function executeAction(command) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return "No active tab";

  const action = command.action;

  // Navigation actions handled by background
  if (action === "key" && command.text === "ctrl+t") {
    await chrome.tabs.create({});
    return "Opened new tab";
  }

  if (action === "navigate" || (action === "type" && command.text?.startsWith("http"))) {
    const url = command.url || command.text;
    await chrome.tabs.update(tab.id, { url });
    await waitForTabLoad(tab.id);
    return `Navigated to ${url}`;
  }

  // Inject and execute content script action
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: executeInPage,
    args: [command],
  });

  return results?.[0]?.result || "Action executed";
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 500);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(resolve, 5000); // max wait 5s
  });
}

// This function runs IN the page context
function executeInPage(command) {
  const action = command.action;

  function getElementAt(x, y) {
    return document.elementFromPoint(x, y);
  }

  function simulateClick(el) {
    if (!el) return;
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    if (el.click) el.click();
  }

  if (action === "left_click" || action === "mouse_move") {
    const [x, y] = command.coordinate || [0, 0];
    const el = getElementAt(x, y);
    if (action === "left_click") {
      simulateClick(el);
      // Focus input fields
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        el.focus();
      }
    }
    return `${action} at (${x}, ${y}) on ${el?.tagName || "unknown"}`;
  }

  if (action === "double_click") {
    const [x, y] = command.coordinate || [0, 0];
    const el = getElementAt(x, y);
    if (el) {
      simulateClick(el);
      simulateClick(el);
      el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    }
    return `Double-clicked at (${x}, ${y})`;
  }

  if (action === "right_click") {
    const [x, y] = command.coordinate || [0, 0];
    const el = getElementAt(x, y);
    if (el) el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    return `Right-clicked at (${x}, ${y})`;
  }

  if (action === "type") {
    const text = command.text || "";
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
      if (active.isContentEditable) {
        active.textContent += text;
      } else {
        const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
          || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        if (nativeInputSetter) nativeInputSetter.call(active, (active.value || "") + text);
        active.dispatchEvent(new Event("input", { bubbles: true }));
        active.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else {
      // Try to find a focused input and type into it
      const input = document.querySelector("input:focus, textarea:focus");
      if (input) {
        input.value += text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    return `Typed: ${text.slice(0, 50)}`;
  }

  if (action === "key") {
    const key = command.text || "";
    const keyMap = { "Return": "Enter", "BackSpace": "Backspace", "Escape": "Escape", "Tab": "Tab" };
    const mappedKey = keyMap[key] || key;
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: mappedKey, code: mappedKey, bubbles: true, cancelable: true })
    );
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keyup", { key: mappedKey, code: mappedKey, bubbles: true })
    );
    return `Pressed ${key}`;
  }

  if (action === "scroll") {
    const [x, y] = command.coordinate || [0, 0];
    const amount = (command.amount || 3) * 100;
    const el = getElementAt(x, y) || document.body;
    el.scrollBy(0, command.direction === "up" ? -amount : amount);
    return `Scrolled ${command.direction} at (${x}, ${y})`;
  }

  return `Unknown action: ${action}`;
}

// ── Main poll loop ────────────────────────────────────────────────────────────

async function pollOnce() {
  if (!config.userId || !config.agentKey) return;

  try {
    // Check for pending session
    const res = await fetch(
      `${config.serverUrl}/api/lyra/computer?userId=${config.userId}`,
      { headers: { "x-agent-key": config.agentKey } }
    );
    const { session } = await res.json();
    if (!session) return;

    // Take screenshot and send
    const screenshot = await captureTab();
    if (!screenshot) return;

    const actionRes = await fetch(`${config.serverUrl}/api/lyra/computer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "screenshot",
        sessionId: session.id,
        screenshot,
        agentKey: config.agentKey,
      }),
    });

    const data = await actionRes.json();

    if (data.action === "execute" && data.command) {
      await executeAction(data.command);
    } else if (data.action === "done") {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Lyra — Task Complete",
        message: data.message || "All done!",
      });
    }
  } catch {
    // Server unreachable — keep polling
  }
}

// ── Start polling ─────────────────────────────────────────────────────────────

async function startPolling() {
  await loadConfig();
  if (polling) return;
  polling = true;
  const loop = async () => {
    if (!polling) return;
    await pollOnce();
    setTimeout(loop, POLL_INTERVAL);
  };
  loop();
}

// ── Message handler (from popup) ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg.type === "save_config") {
    config = { ...config, ...msg.config };
    chrome.storage.local.set(msg.config).then(() => respond({ ok: true }));
    if (!polling) startPolling();
    return true;
  }
  if (msg.type === "get_status") {
    respond({ polling, config });
    return true;
  }
  if (msg.type === "stop") {
    polling = false;
    respond({ ok: true });
    return true;
  }
});

// Auto-start on install/reload
chrome.runtime.onStartup.addListener(startPolling);
chrome.runtime.onInstalled.addListener(startPolling);
startPolling();
