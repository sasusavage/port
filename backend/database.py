"""
PostgreSQL database helpers for portfolio CMS.
"""
import os
import json
import psycopg2
import psycopg2.extras
from werkzeug.security import generate_password_hash, check_password_hash

DATABASE_URL = os.getenv('DATABASE_URL')


def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def init_db():
    """Create tables and seed the default admin user if not present."""
    with get_db() as conn:
        with conn.cursor() as cur:
            # Projects table
            cur.execute('''
                CREATE TABLE IF NOT EXISTS projects (
                    id          SERIAL PRIMARY KEY,
                    title       TEXT    NOT NULL,
                    description TEXT,
                    image_url   TEXT,
                    project_url TEXT,
                    tags        TEXT    DEFAULT '[]',
                    order_index INTEGER DEFAULT 0,
                    created_at  TIMESTAMPTZ DEFAULT NOW()
                )
            ''')

            # Admins table
            cur.execute('''
                CREATE TABLE IF NOT EXISTS admins (
                    id            SERIAL PRIMARY KEY,
                    username      TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL
                )
            ''')

            # Seed default admin (sasusavage / nbaSavage123$) if no admin exists
            cur.execute('SELECT COUNT(*) FROM admins')
            count = cur.fetchone()[0]
            if count == 0:
                cur.execute(
                    'INSERT INTO admins (username, password_hash) VALUES (%s, %s)',
                    ('sasusavage', generate_password_hash('nbaSavage123$'))
                )

        conn.commit()


# ── Projects ──────────────────────────────────────────────────────────────────

def get_all_projects():
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute('SELECT * FROM projects ORDER BY order_index ASC, id ASC')
            rows = cur.fetchall()
    projects = []
    for row in rows:
        p = dict(row)
        p['tags'] = json.loads(p['tags'] or '[]')
        projects.append(p)
    return projects


def get_project(project_id):
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute('SELECT * FROM projects WHERE id = %s', (project_id,))
            row = cur.fetchone()
    if not row:
        return None
    p = dict(row)
    p['tags'] = json.loads(p['tags'] or '[]')
    return p


def create_project(title, description, image_url, project_url, tags, order_index=0):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''INSERT INTO projects (title, description, image_url, project_url, tags, order_index)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id''',
                (title, description, image_url, project_url, json.dumps(tags), order_index)
            )
            new_id = cur.fetchone()[0]
        conn.commit()
    return new_id


def update_project(project_id, title, description, image_url, project_url, tags, order_index):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''UPDATE projects
                   SET title=%s, description=%s, image_url=%s, project_url=%s,
                       tags=%s, order_index=%s
                   WHERE id=%s''',
                (title, description, image_url, project_url, json.dumps(tags), order_index, project_id)
            )
        conn.commit()


def delete_project(project_id):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM projects WHERE id = %s', (project_id,))
        conn.commit()


def reorder_projects(ordered_ids):
    with get_db() as conn:
        with conn.cursor() as cur:
            for idx, pid in enumerate(ordered_ids):
                cur.execute('UPDATE projects SET order_index=%s WHERE id=%s', (idx, pid))
        conn.commit()


# ── Admins ────────────────────────────────────────────────────────────────────

def verify_admin(username, password):
    """Return True if username/password match a record in the admins table."""
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute('SELECT password_hash FROM admins WHERE username = %s', (username,))
            row = cur.fetchone()
    if not row:
        return False
    return check_password_hash(row['password_hash'], password)


def change_admin_password(username, new_password):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'UPDATE admins SET password_hash=%s WHERE username=%s',
                (generate_password_hash(new_password), username)
            )
        conn.commit()
