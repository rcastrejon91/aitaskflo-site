#!/usr/bin/env python3
"""
Lyra Desktop Agent
==================
Gives Lyra control over your computer — mouse, keyboard, screenshots.

Install dependencies:
  pip install pyautogui pillow requests

Run:
  python lyra-agent.py --key YOUR_AGENT_KEY --user YOUR_USER_ID

Get your User ID from: https://aitaskflo.com/account
Get your Agent Key from: https://aitaskflo.com/account (Agent section)
"""

import argparse
import base64
import io
import json
import sys
import time

try:
    import pyautogui
    import requests
    from PIL import Image
except ImportError:
    print("Missing dependencies. Run: pip install pyautogui pillow requests")
    sys.exit(1)

# Safety: move mouse to corner to abort
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.1

HOST = "https://aitaskflo.com"


def take_screenshot() -> str:
    """Take a screenshot and return as base64 PNG string."""
    img = pyautogui.screenshot()
    # Resize to 1280x800 to save bandwidth
    img = img.resize((1280, 800), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()


def execute_action(command: dict):
    """Execute a computer action from Claude."""
    action = command.get("action", "")

    if action == "screenshot":
        pass  # next loop will take one

    elif action == "mouse_move":
        x, y = _scale_coord(command.get("coordinate", [960, 540]))
        pyautogui.moveTo(x, y, duration=0.25)

    elif action == "left_click":
        x, y = _scale_coord(command.get("coordinate", [960, 540]))
        pyautogui.click(x, y)

    elif action == "right_click":
        x, y = _scale_coord(command.get("coordinate", [960, 540]))
        pyautogui.rightClick(x, y)

    elif action == "double_click":
        x, y = _scale_coord(command.get("coordinate", [960, 540]))
        pyautogui.doubleClick(x, y)

    elif action == "left_click_drag":
        sx, sy = _scale_coord(command.get("start_coordinate", [0, 0]))
        ex, ey = _scale_coord(command.get("coordinate", [100, 100]))
        pyautogui.moveTo(sx, sy, duration=0.2)
        pyautogui.dragTo(ex, ey, duration=0.4, button="left")

    elif action == "type":
        text = command.get("text", "")
        pyautogui.write(text, interval=0.04)

    elif action == "key":
        key = command.get("key", "").replace("+", " ")
        # Handle combos like "ctrl+c" -> pyautogui.hotkey("ctrl", "c")
        parts = command.get("key", "").split("+")
        if len(parts) > 1:
            pyautogui.hotkey(*parts)
        else:
            pyautogui.press(key)

    elif action == "scroll":
        x, y = _scale_coord(command.get("coordinate", [960, 540]))
        direction = command.get("direction", "down")
        amount = int(command.get("amount", 3))
        clicks = -amount if direction == "down" else amount
        pyautogui.scroll(clicks, x=x, y=y)

    elif action == "cursor_position":
        pass  # just report position, no action needed

    else:
        print(f"  [unknown action: {action}]")


def _scale_coord(coord):
    """Scale from Claude's 1920x1080 to actual screen size."""
    screen_w, screen_h = pyautogui.size()
    x = int(coord[0] * screen_w / 1920)
    y = int(coord[1] * screen_h / 1080)
    return x, y


def main():
    parser = argparse.ArgumentParser(description="Lyra Desktop Agent")
    parser.add_argument("--key", required=True, help="Agent key (from aitaskflo.com/account)")
    parser.add_argument("--user", required=True, help="Your Lyra user ID")
    parser.add_argument("--host", default=HOST, help="Lyra server URL")
    parser.add_argument("--poll", type=float, default=3.0, help="Poll interval (seconds)")
    args = parser.parse_args()

    print("=" * 50)
    print("  Lyra Desktop Agent")
    print("=" * 50)
    print(f"  Server : {args.host}")
    print(f"  User   : {args.user}")
    print(f"  Safety : Move mouse to top-left corner to ABORT")
    print()
    print("  Waiting for tasks from Lyra...")
    print()

    current_session = None
    error_count = 0

    while True:
        try:
            if current_session:
                # Active session — take screenshot and submit
                screenshot = take_screenshot()
                resp = requests.post(
                    f"{args.host}/api/lyra/computer",
                    json={
                        "action": "screenshot",
                        "sessionId": current_session,
                        "screenshot": screenshot,
                        "agentKey": args.key,
                    },
                    timeout=45,
                )
                resp.raise_for_status()
                data = resp.json()
                error_count = 0

                if data.get("action") == "done":
                    print(f"  ✓ Done: {data.get('message', 'Task complete')}")
                    current_session = None

                elif data.get("action") == "execute":
                    cmd = data.get("command", {})
                    act = cmd.get("action", "?")
                    detail = cmd.get("coordinate") or cmd.get("text", "") or cmd.get("key", "")
                    print(f"  → {act} {detail}")
                    execute_action(cmd)
                    time.sleep(0.6)  # let UI settle before next screenshot

                elif data.get("action") == "error":
                    print(f"  ✗ Error: {data.get('message')}")
                    current_session = None

            else:
                # Poll for a new pending task
                resp = requests.get(
                    f"{args.host}/api/lyra/computer",
                    params={"userId": args.user},
                    headers={"x-agent-key": args.key},
                    timeout=10,
                )
                resp.raise_for_status()
                data = resp.json()
                session = data.get("session")

                if session and session.get("status") in ("pending", "waiting_screenshot"):
                    current_session = session["id"]
                    print(f"\n  ▶ New task: {session.get('task', '')}")
                    print(f"    Session: {current_session}")

            error_count = 0

        except KeyboardInterrupt:
            print("\n  Agent stopped.")
            sys.exit(0)

        except Exception as e:
            error_count += 1
            print(f"  [error #{error_count}] {e}")
            if error_count >= 10:
                print("  Too many errors, stopping.")
                sys.exit(1)

        time.sleep(1.0 if current_session else args.poll)


if __name__ == "__main__":
    main()
