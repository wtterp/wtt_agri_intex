from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Iterable

from config import Config
from models import AgricultureData


def _connect() -> sqlite3.Connection:
    path = Path(Config.DATABASE_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_database() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS agriculture_data(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_submission_id TEXT UNIQUE,
                name TEXT NOT NULL,
                mobile_number TEXT NOT NULL,
                address TEXT NOT NULL,
                water_requirement TEXT NOT NULL,
                water_source TEXT NOT NULL,
                crops TEXT NOT NULL,
                acres_of_land TEXT NOT NULL,
                soil_type TEXT NOT NULL,
                other_soil_type TEXT,
                water_parameters TEXT NOT NULL,
                advance_received INTEGER DEFAULT 0,
                advance_amount TEXT,
                google_synced INTEGER DEFAULT 0,
                erp_synced INTEGER DEFAULT 0,
                created_at TEXT,
                synced_at TEXT
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_agri_pending ON agriculture_data(google_synced, erp_synced, created_at)"
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS submission_receipts(
                client_submission_id TEXT PRIMARY KEY,
                state TEXT NOT NULL,
                whatsapp_sent INTEGER DEFAULT 0,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def insert_pending(data: AgricultureData) -> int:
    values = data.to_db_dict()
    columns = list(values.keys())
    placeholders = ",".join("?" for _ in columns)
    sql = f"INSERT OR IGNORE INTO agriculture_data ({','.join(columns)}) VALUES ({placeholders})"
    with _connect() as conn:
        cursor = conn.execute(sql, [values[c] for c in columns])
        conn.commit()
        if cursor.lastrowid:
            return int(cursor.lastrowid)
        if data.client_submission_id:
            row = conn.execute(
                "SELECT id FROM agriculture_data WHERE client_submission_id = ?",
                (data.client_submission_id,),
            ).fetchone()
            if row:
                return int(row["id"])
        raise RuntimeError("Could not insert or locate pending agriculture record")


def get_pending_by_client_id(client_submission_id: str | None) -> AgricultureData | None:
    if not client_submission_id:
        return None
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM agriculture_data WHERE client_submission_id = ? LIMIT 1",
            (client_submission_id,),
        ).fetchone()
    return AgricultureData.from_row(row) if row else None


def get_pending() -> list[AgricultureData]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM agriculture_data
            WHERE google_synced = 0 OR erp_synced = 0
            ORDER BY created_at ASC, id ASC
            """
        ).fetchall()
    return [AgricultureData.from_row(r) for r in rows]


def get_pending_count() -> int:
    with _connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS total FROM agriculture_data WHERE google_synced = 0 OR erp_synced = 0"
        ).fetchone()
        return int(row["total"])


def update_sync_flags(record_id: int, *, google_synced: bool | None = None, erp_synced: bool | None = None) -> None:
    updates: list[str] = []
    values: list[object] = []
    if google_synced is not None:
        updates.append("google_synced = ?")
        values.append(int(google_synced))
    if erp_synced is not None:
        updates.append("erp_synced = ?")
        values.append(int(erp_synced))
    if not updates:
        return
    values.append(record_id)
    with _connect() as conn:
        conn.execute(f"UPDATE agriculture_data SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()


def delete_record(record_id: int) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM agriculture_data WHERE id = ?", (record_id,))
        conn.commit()


def set_receipt(client_submission_id: str | None, state: str, *, whatsapp_sent: bool | None = None) -> None:
    if not client_submission_id:
        return
    with _connect() as conn:
        existing = conn.execute(
            "SELECT whatsapp_sent FROM submission_receipts WHERE client_submission_id = ?",
            (client_submission_id,),
        ).fetchone()
        current_whatsapp = int(existing["whatsapp_sent"]) if existing else 0
        if whatsapp_sent is not None:
            current_whatsapp = int(whatsapp_sent)
        conn.execute(
            """
            INSERT INTO submission_receipts(client_submission_id, state, whatsapp_sent, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(client_submission_id) DO UPDATE SET
                state = excluded.state,
                whatsapp_sent = excluded.whatsapp_sent,
                updated_at = excluded.updated_at
            """,
            (client_submission_id, state, current_whatsapp, datetime.now().isoformat(timespec="seconds")),
        )
        conn.commit()


def get_receipt(client_submission_id: str | None) -> sqlite3.Row | None:
    if not client_submission_id:
        return None
    with _connect() as conn:
        return conn.execute(
            "SELECT * FROM submission_receipts WHERE client_submission_id = ?",
            (client_submission_id,),
        ).fetchone()
