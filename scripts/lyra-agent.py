#!/usr/bin/env python3
"""
Lyra Desktop Agent
==================
Runs on your computer and gives Lyra full control of your screen.

Install deps:
  pip install pyautogui pillow requests

Run:
  python lyra-agent.py --url https://aitaskflo.com --user YOUR_USER_ID --key YOUR_AGENT_KEY
"""

import argparse
import base64
import io
import json
import time
import sys

try:
    import pyautogui
    import requests
    from PIL import ImageGrab
except ImportError:
    print("Missing dependencies. Run: pip install pyautogui pillow requests")
    sys.exit(1)

pyautogui.FAILSAFE = True  # Move mouse to top-left corner to abort
pyautogui.PAUSE = 0.3

# ── Screenshot ────────────────────────────────────────────────────────────────

def take_screenshot() -> str:
    """Take a screenshot and return as base64 PNG."""
    img = ImageGrab.grab()
    # Scale down to max 1280px wide to save bandwidth
    max_w = 1280
    if img.width > max_w:
        ratio = max_w / img.width
        img = img.resize((max_w, int(img.height * ratio)))
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()

# ── Execute action ────────────────────────────────────────────────────────────

def execute_action(command: dict) -> str:
    """Execute a Claude computer use action."""
    action = command.get("action")

    if action == "screenshot":
        return "screenshot_taken"

    elif action == "mouse_move":
        x, y = command.get("coordinate", [0, 0])
        pyautogui.moveTo(x, y, duration=0.3)
        return f"Moved mouse to ({x}, {y})"

    elif action == "left_click":
        x, y = command.get("coordinate", [0, 0])
        pyautogui.click(x, y)
        return f"Clicked ({x}, {y})"

    elif action == "right_click":
        x, y = command.get("coordinate", [0, 0])
        pyautogui.rightClick(x, y)
        return f"Right-clicked ({x}, {y})"

    elif action == "double_click":
        x, y = command.get("coordinate", [0, 0])
        pyautogui.doubleClick(x, y)
        return f"Double-clicked ({x}, {y})"

    elif action == "left_click_drag":
        start = command.get("start_coordinate", [0, 0])
        end = command.get("coordinate", [0, 0])
        pyautogui.drag(end[0] - start[0], end[1] - start[1], startX=start[0], startY=start[1], duration=0.5)
        return f"Dragged from {start} to {end}"

    elif action == "type":
        text = command.get("text", "")
        pyautogui.typewrite(text, interval=0.05)
        return f"Typed: {text[:50]}{'...' if len(text) > 50 else ''}"

    elif action == "key":
        key = command.get("text", "")
        # Map Claude key names to pyautogui
        key_map = {
            "Return": "enter", "BackSpace": "backspace", "Delete": "delete",
            "Escape": "esc", "Tab": "tab", "space": "space",
            "ctrl+c": "ctrl+c", "ctrl+v": "ctrl+v", "ctrl+a": "ctrl+a",
            "ctrl+z": "ctrl+z", "ctrl+s": "ctrl+s",
        }
        mapped = key_map.get(key, key.lower())
        if "+" in mapped:
            parts = mapped.split("+")
            pyautogui.hotkey(*parts)
        else:
            pyautogui.press(mapped)
        return f"Pressed key: {key}"

    elif action == "scroll":
        x, y = command.get("coordinate", [0, 0])
        direction = command.get("direction", "down")
        clicks = command.get("amount", 3)
        pyautogui.moveTo(x, y)
        pyautogui.scroll(clicks if direction == "up" else -clicks)
        return f"Scrolled {direction} at ({x}, {y})"

    else:
        return f"Unknown action: {action}"

# ── Main agent loop ───────────────────────────────────────────────────────────

def run(server_url: str, user_id: str, agent_key: str):
    headers = {"x-agent-key": agent_key, "Content-Type": "application/json"}
    poll_url = f"{server_url}/api/lyra/computer"
    session_id = None

    print(f"🤖 Lyra Agent running — connected to {server_url}")
    print(f"   User: {user_id}")
    print(f"   Move mouse to top-left corner to abort at any time.\n")

    while True:
        try:
            # Poll for a pending task if we don't have a session
            if not session_id:
                res = requests.get(
                    f"{poll_url}?userId={user_id}",
                    headers=headers,
                    timeout=10
                )
                data = res.json()
                session = data.get("session")
                if session:
                    session_id = session["id"]
                    print(f"📋 New task: {session['task']}")
                else:
                    time.sleep(2)
                    continue

            # Take screenshot and send to server
            print("📸 Taking screenshot...")
            screenshot = take_screenshot()

            res = requests.post(poll_url, json={
                "action": "screenshot",
                "sessionId": session_id,
                "screenshot": screenshot,
                "agentKey": agent_key,
            }, timeout=60)

            data = res.json()
            action_type = data.get("action")

            if action_type == "done":
                print(f"✅ Done: {data.get('message', 'Task complete')}")
                session_id = None
                time.sleep(1)

            elif action_type == "error":
                print(f"❌ Error: {data.get('message')}")
                session_id = None
                time.sleep(2)

            elif action_type == "execute":
                command = data.get("command", {})
                print(f"⚡ Executing: {command.get('action')} {command.get('coordinate', '')}")
                result = execute_action(command)
                print(f"   → {result}")
                time.sleep(0.5)  # Small pause between actions

            else:
                time.sleep(1)

        except KeyboardInterrupt:
            print("\n👋 Lyra Agent stopped.")
            break
        except Exception as e:
            print(f"⚠️  Error: {e}")
            time.sleep(3)

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lyra Desktop Agent")
    parser.add_argument("--url", default="https://aitaskflo.com", help="Server URL")
    parser.add_argument("--user", required=True, help="Your user ID")
    parser.add_argument("--key", required=True, help="Agent key (from /account)")
    args = parser.parse_args()

    run(args.url, args.user, args.key)
