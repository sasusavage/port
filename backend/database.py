"""
SQLite database helpers for portfolio CMS.
"""
import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'portfolio.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL,
                description TEXT,
                image_url   TEXT,
                project_url TEXT,
                tags        TEXT    DEFAULT '[]',
                order_index INTEGER DEFAULT 0,
                created_at  TEXT    DEFAULT (datetime('now'))
            )
        ''')
        conn.commit()


def get_all_projects():
    with get_db() as conn:
        rows = conn.execute(
            'SELECT * FROM projects ORDER BY order_index ASC, id ASC'
        ).fetchall()
    projects = []
    for row in rows:
        p = dict(row)
        p['tags'] = json.loads(p['tags'] or '[]')
        projects.append(p)
    return projects


def get_project(project_id):
    with get_db() as conn:
        row = conn.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    if not row:
        return None
    p = dict(row)
    p['tags'] = json.loads(p['tags'] or '[]')
    return p


def create_project(title, description, image_url, project_url, tags, order_index=0):
    with get_db() as conn:
        cur = conn.execute(
            'INSERT INTO projects (title, description, image_url, project_url, tags, order_index) VALUES (?,?,?,?,?,?)',
            (title, description, image_url, project_url, json.dumps(tags), order_index)
        )
        conn.commit()
        return cur.lastrowid


def update_project(project_id, title, description, image_url, project_url, tags, order_index):
    with get_db() as conn:
        conn.execute(
            '''UPDATE projects
               SET title=?, description=?, image_url=?, project_url=?, tags=?, order_index=?
               WHERE id=?''',
            (title, description, image_url, project_url, json.dumps(tags), order_index, project_id)
        )
        conn.commit()


def delete_project(project_id):
    with get_db() as conn:
        conn.execute('DELETE FROM projects WHERE id = ?', (project_id,))
        conn.commit()


def reorder_projects(ordered_ids):
    """Update order_index for a list of project IDs in the given order."""
    with get_db() as conn:
        for idx, pid in enumerate(ordered_ids):
            conn.execute('UPDATE projects SET order_index=? WHERE id=?', (idx, pid))
        conn.commit()
