import sqlite3
from pathlib import Path


DATABASE_PATH = Path(__file__).parent / "campusai.db"


def create_table():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            student_id TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL,
            department TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT,
            category TEXT,
            department TEXT,
            status TEXT,
            created_at TEXT,
            user_id INTEGER
        )
        """
    )

    columns = [row[1] for row in connection.execute("PRAGMA table_info(tickets)")]
    if "user_id" not in columns:
        connection.execute("ALTER TABLE tickets ADD COLUMN user_id INTEGER")

    connection.commit()
    connection.close()


def create_ticket(question, category, department, user_id=None):
    connection = sqlite3.connect(DATABASE_PATH)
    cursor = connection.execute(
        """
        INSERT INTO tickets (question, category, department, status, created_at, user_id)
        VALUES (?, ?, ?, ?, datetime('now'), ?)
        """,
        (question, category, department, "Pending", user_id),
    )
    connection.commit()
    ticket_id = cursor.lastrowid
    connection.close()
    return ticket_id


def get_ticket(ticket_id):
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    row = connection.execute(
        """
        SELECT tickets.*, users.full_name AS student_name
        FROM tickets
        LEFT JOIN users ON users.id = tickets.user_id
        WHERE tickets.id = ?
        """,
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
        """
        SELECT tickets.*, users.full_name AS student_name
        FROM tickets
        LEFT JOIN users ON users.id = tickets.user_id
        ORDER BY tickets.id
        """
    ).fetchall()
    connection.close()
    return [dict(row) for row in rows]


def get_tickets_for_user(user_id):
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        """
        SELECT tickets.*, users.full_name AS student_name
        FROM tickets
        LEFT JOIN users ON users.id = tickets.user_id
        WHERE tickets.user_id = ?
        ORDER BY tickets.id
        """,
        (user_id,),
    ).fetchall()
    connection.close()
    return [dict(row) for row in rows]


def create_user(
    full_name,
    student_id,
    username,
    password_hash,
    password_salt,
    department,
    role="student",
):
    connection = sqlite3.connect(DATABASE_PATH)
    cursor = connection.execute(
        """
        INSERT INTO users (
            full_name, student_id, username, password_hash, password_salt,
            department, role, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        (
            full_name,
            student_id,
            username,
            password_hash,
            password_salt,
            department,
            role,
        ),
    )
    connection.commit()
    user_id = cursor.lastrowid
    connection.close()
    return user_id


def get_user_by_login(login_value):
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    row = connection.execute(
        """
        SELECT * FROM users
        WHERE username = ? OR student_id = ?
        """,
        (login_value, login_value),
    ).fetchone()
    connection.close()
    return dict(row) if row else None


def get_user(user_id):
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    row = connection.execute(
        "SELECT * FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    connection.close()
    return dict(row) if row else None


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
