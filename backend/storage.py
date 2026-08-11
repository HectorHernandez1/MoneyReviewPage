"""
Persistent chatbot storage: memories (facts, preferences, insights) and
conversations, in two tables in the budget_app schema.

Tables are created with an idempotent bootstrap at backend startup. If the
DB role lacks CREATE on the schema, the bootstrap fails soft: the chatbot
keeps working statelessly and every storage call returns an error/empty
result instead of raising. Memory contents live only in the database —
never in this (public) repository.
"""

import json
import time
import uuid
import psycopg2
import psycopg2.extras

from db import DB_CONFIG

MEMORY_KINDS = ("fact", "preference", "insight")

# None = bootstrap not attempted yet; True/False after ensure_tables().
# A False result is retried after a cooldown so a transient DB outage at
# startup doesn't disable storage until the next process restart.
_available = None
_last_attempt = 0.0
_RETRY_SECONDS = 60

_DDL = """
CREATE TABLE IF NOT EXISTS budget_app.chat_memory (
    id SERIAL PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('fact', 'preference', 'insight')),
    person TEXT,
    content TEXT NOT NULL,
    period_tag TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS budget_app.chat_conversations (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    history JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def _execute(query, params=(), fetch=False):
    """Run one statement with commit. Returns rows (as dicts) when fetch=True."""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(query, params)
            rows = [dict(r) for r in cur.fetchall()] if fetch else None
        conn.commit()
        return rows
    finally:
        if conn:
            conn.close()


def ensure_tables():
    """Create storage tables if missing. Safe to call on every startup."""
    global _available, _last_attempt
    _last_attempt = time.monotonic()
    try:
        _execute(_DDL)
        _available = True
    except Exception as e:
        _available = False
        print(
            f"WARNING: chatbot storage unavailable ({e}). "
            "Memory and server-side conversation history are disabled; "
            "the chatbot still works statelessly and will retry every "
            f"{_RETRY_SECONDS}s. If this is a permissions error, grant "
            "CREATE on schema budget_app to the app DB role "
            "or run the DDL in backend/storage.py manually."
        )
    return _available


def storage_available():
    if _available is None or (
        _available is False and time.monotonic() - _last_attempt > _RETRY_SECONDS
    ):
        ensure_tables()
    return _available


# ---------------------------------------------------------------- memories

def list_memories():
    """Active memories for prompt recall: newest 20 facts/preferences + newest 12 insights."""
    if not storage_available():
        return []
    try:
        facts = _execute(
            """
            SELECT id, kind, person, content, period_tag, created_at::date AS created
            FROM budget_app.chat_memory
            WHERE active AND kind IN ('fact', 'preference')
            ORDER BY created_at DESC LIMIT 20
            """,
            fetch=True,
        )
        insights = _execute(
            """
            SELECT id, kind, person, content, period_tag, created_at::date AS created
            FROM budget_app.chat_memory
            WHERE active AND kind = 'insight'
            ORDER BY created_at DESC LIMIT 12
            """,
            fetch=True,
        )
        return facts + insights
    except Exception as e:
        print(f"WARNING: failed to load chat memories: {e}")
        return []


def add_memory(kind, content, person=None, period_tag=None):
    if kind not in MEMORY_KINDS:
        return {"error": f"kind must be one of {MEMORY_KINDS}"}
    if not content or not str(content).strip():
        return {"error": "content is required"}
    if not storage_available():
        return {"error": "memory storage is unavailable (see backend logs)"}
    try:
        rows = _execute(
            """
            INSERT INTO budget_app.chat_memory (kind, person, content, period_tag)
            VALUES (%s, %s, %s, %s) RETURNING id
            """,
            (kind, person, str(content).strip(), period_tag),
            fetch=True,
        )
        return {"saved": True, "memory_id": rows[0]["id"]}
    except Exception as e:
        return {"error": str(e)}


def deactivate_memory(memory_id):
    if not storage_available():
        return {"error": "memory storage is unavailable (see backend logs)"}
    try:
        rows = _execute(
            """
            UPDATE budget_app.chat_memory
            SET active = FALSE, updated_at = now()
            WHERE id = %s AND active RETURNING id
            """,
            (memory_id,),
            fetch=True,
        )
        if not rows:
            return {"error": f"no active memory with id {memory_id}"}
        return {"forgotten": True, "memory_id": memory_id}
    except Exception as e:
        return {"error": str(e)}


# ------------------------------------------------------------ conversations

def upsert_conversation(conversation_id, title, history):
    if not storage_available():
        return False
    try:
        _execute(
            """
            INSERT INTO budget_app.chat_conversations (id, title, history, updated_at)
            VALUES (%s, %s, %s::jsonb, now())
            ON CONFLICT (id) DO UPDATE
            SET history = CASE
                    -- Guard against a stale device wiping newer turns: never
                    -- let a shorter history replace a longer saved one
                    WHEN jsonb_array_length(EXCLUDED.history)
                         >= jsonb_array_length(chat_conversations.history)
                    THEN EXCLUDED.history
                    ELSE chat_conversations.history END,
                title = CASE WHEN chat_conversations.title = '' THEN EXCLUDED.title
                             ELSE chat_conversations.title END,
                updated_at = now()
            """,
            (conversation_id, title or "", json.dumps(history or [])),
        )
        return True
    except Exception as e:
        print(f"WARNING: failed to save conversation {conversation_id}: {e}")
        return False


def get_conversation(conversation_id):
    if not storage_available():
        return None
    try:
        rows = _execute(
            "SELECT id, title, history, updated_at FROM budget_app.chat_conversations WHERE id = %s",
            (conversation_id,),
            fetch=True,
        )
        return _conversation_row(rows[0]) if rows else None
    except Exception as e:
        print(f"WARNING: failed to load conversation {conversation_id}: {e}")
        return None


def get_latest_conversation():
    if not storage_available():
        return None
    try:
        rows = _execute(
            "SELECT id, title, history, updated_at FROM budget_app.chat_conversations ORDER BY updated_at DESC LIMIT 1",
            fetch=True,
        )
        return _conversation_row(rows[0]) if rows else None
    except Exception as e:
        print(f"WARNING: failed to load latest conversation: {e}")
        return None


def list_conversations(limit=20):
    if not storage_available():
        return []
    try:
        return [
            {"id": str(r["id"]), "title": r["title"], "updated_at": str(r["updated_at"])}
            for r in _execute(
                "SELECT id, title, updated_at FROM budget_app.chat_conversations ORDER BY updated_at DESC LIMIT %s",
                (limit,),
                fetch=True,
            )
        ]
    except Exception as e:
        print(f"WARNING: failed to list conversations: {e}")
        return []


def delete_conversation(conversation_id):
    if not storage_available():
        return False
    try:
        _execute("DELETE FROM budget_app.chat_conversations WHERE id = %s", (conversation_id,))
        return True
    except Exception as e:
        print(f"WARNING: failed to delete conversation {conversation_id}: {e}")
        return False


def _conversation_row(row):
    history = row["history"]
    if isinstance(history, str):
        history = json.loads(history)
    return {
        "id": str(row["id"]),
        "title": row["title"],
        "history": history,
        "updated_at": str(row["updated_at"]),
    }


def new_conversation_id():
    return str(uuid.uuid4())


# ------------------------------------------------------- chatbot tool handlers

def handle_remember(args):
    return add_memory(
        kind=args.get("kind"),
        content=args.get("content"),
        person=args.get("person"),
        period_tag=args.get("period_tag"),
    )


def handle_forget(args):
    memory_id = args.get("memory_id")
    if memory_id is None:
        return {"error": "memory_id is required"}
    return deactivate_memory(memory_id)


MEMORY_TOOL_HANDLERS = {
    "remember": handle_remember,
    "forget": handle_forget,
}
