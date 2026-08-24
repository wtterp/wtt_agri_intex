from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

from config import Config
from models import ExhibitionLead


def _connect() -> sqlite3.Connection:
    path = Path(Config.DATABASE_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=30)
    conn.row_factory = sqlite3.Row
    # WAL is useful locally. Vercel /tmp also supports it, but failure should not
    # prevent startup on a constrained serverless filesystem.
    try:
        conn.execute("PRAGMA journal_mode=WAL")
    except sqlite3.DatabaseError:
        pass
    return conn


def init_database() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS exhibition_leads(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_submission_id TEXT NOT NULL UNIQUE,
                payload_json TEXT NOT NULL,
                google_synced INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                synced_at TEXT
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_exhibition_pending ON exhibition_leads(google_synced, created_at)"
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS exhibition_submission_receipts(
                client_submission_id TEXT PRIMARY KEY,
                state TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def insert_pending(data: ExhibitionLead) -> int:
    created_at = str(data.payload.get("created_at") or datetime.now().isoformat(timespec="seconds"))
    payload_json = data.to_db_values()[1]
    with _connect() as conn:
        cursor = conn.execute(
            """
            INSERT OR IGNORE INTO exhibition_leads
                (client_submission_id, payload_json, google_synced, created_at, synced_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (data.client_submission_id, payload_json, int(data.google_synced), created_at, data.synced_at),
        )
        conn.commit()
        if cursor.lastrowid:
            return int(cursor.lastrowid)
        row = conn.execute(
            "SELECT id FROM exhibition_leads WHERE client_submission_id = ?",
            (data.client_submission_id,),
        ).fetchone()
        if row:
            return int(row["id"])
        raise RuntimeError("Could not insert or locate pending exhibition lead")


def get_pending_by_client_id(client_submission_id: str) -> ExhibitionLead | None:
    if not client_submission_id:
        return None
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM exhibition_leads WHERE client_submission_id = ? LIMIT 1",
            (client_submission_id,),
        ).fetchone()
    return ExhibitionLead.from_row(row) if row else None


def get_pending() -> list[ExhibitionLead]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM exhibition_leads WHERE google_synced = 0 ORDER BY created_at ASC, id ASC"
        ).fetchall()
    return [ExhibitionLead.from_row(row) for row in rows]


def get_pending_count() -> int:
    with _connect() as conn:
        row = conn.execute("SELECT COUNT(*) AS total FROM exhibition_leads WHERE google_synced = 0").fetchone()
        return int(row["total"])


def mark_google_synced(record_id: int) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE exhibition_leads SET google_synced = 1, synced_at = ? WHERE id = ?",
            (datetime.now().isoformat(timespec="seconds"), record_id),
        )
        conn.commit()


def delete_record(record_id: int) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM exhibition_leads WHERE id = ?", (record_id,))
        conn.commit()


def set_receipt(client_submission_id: str, state: str) -> None:
    if not client_submission_id:
        return
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO exhibition_submission_receipts(client_submission_id, state, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(client_submission_id) DO UPDATE SET
                state = excluded.state,
                updated_at = excluded.updated_at
            """,
            (client_submission_id, state, datetime.now().isoformat(timespec="seconds")),
        )
        conn.commit()


def get_receipt(client_submission_id: str) -> sqlite3.Row | None:
    if not client_submission_id:
        return None
    with _connect() as conn:
        return conn.execute(
            "SELECT * FROM exhibition_submission_receipts WHERE client_submission_id = ?",
            (client_submission_id,),
        ).fetchone()
