import sqlite3
from pathlib import Path


DATABASE_PATH = Path(__file__).parent / "campusai.db"


def create_table():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT,
            category TEXT,
            department TEXT,
            status TEXT,
            created_at TEXT
        )
        """
    )
    connection.commit()
    connection.close()


def create_ticket(question, category, department):
    connection = sqlite3.connect(DATABASE_PATH)
    cursor = connection.execute(
        """
        INSERT INTO tickets (question, category, department, status, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        """,
        (question, category, department, "Pending"),
    )
    connection.commit()
    ticket_id = cursor.lastrowid
    connection.close()
    return ticket_id


def get_ticket(ticket_id):
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    row = connection.execute(
        "SELECT * FROM tickets WHERE id = ?",
        (ticket_id,),
    ).fetchone()
    connection.close()

    if row is None:
        return None

    return dict(row)


def get_all_tickets():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        "SELECT * FROM tickets ORDER BY id"
    ).fetchall()
    connection.close()
    return [dict(row) for row in rows]


def update_ticket_status(ticket_id, status):
    connection = sqlite3.connect(DATABASE_PATH)
    cursor = connection.execute(
        "UPDATE tickets SET status = ? WHERE id = ?",
        (status, ticket_id),
    )
    connection.commit()
    updated = cursor.rowcount > 0
    connection.close()
    return updated


create_table()
