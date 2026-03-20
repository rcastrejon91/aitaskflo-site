"""
SQLite bridge — reads user context from the shared data/lyra.db
(same database used by the Next.js backend).
"""
import os
import sqlite3
from pathlib import Path
from typing import Dict, List


def _db_path() -> str:
    """Resolve path to lyra.db — env var overrides default."""
    env = os.environ.get("LYRA_DB_PATH")
    if env:
        return env
    # Default: two directories up from this file → aitaskflo/data/lyra.db
    return str(Path(__file__).resolve().parent.parent / "data" / "lyra.db")


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def get_user_context(user_id: str) -> Dict:
    """Return memory context for a user — name, facts, recent conversation summaries."""
    if not user_id:
        return {}
    try:
        conn = _get_conn()
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            return {}
        facts_rows = conn.execute(
            "SELECT key, value FROM facts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20",
            (user_id,),
        ).fetchall()
        convo_rows = conn.execute(
            "SELECT summary FROM conversations WHERE user_id = ? AND summary IS NOT NULL "
            "ORDER BY timestamp DESC LIMIT 5",
            (user_id,),
        ).fetchall()
        conn.close()
        return {
            "name": user["name"],
            "facts": {r["key"]: r["value"] for r in facts_rows},
            "recent_conversations": [r["summary"] for r in convo_rows],
        }
    except Exception:
        return {}


def record_conversation(conversation_id: str, user_id: str, summary: str, message_count: int) -> None:
    """Upsert a conversation record into the shared SQLite."""
    if not user_id:
        return
    try:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        conn = _get_conn()
        # Ensure user row exists
        conn.execute(
            "INSERT OR IGNORE INTO users (id, first_seen, last_seen) VALUES (?, ?, ?)",
            (user_id, now, now),
        )
        conn.execute(
            "UPDATE users SET last_seen = ? WHERE id = ?",
            (now, user_id),
        )
        conn.execute(
            """INSERT INTO conversations (id, user_id, summary, message_count, timestamp)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 summary = excluded.summary,
                 message_count = excluded.message_count,
                 timestamp = excluded.timestamp""",
            (conversation_id, user_id, summary, message_count, now),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass
