"""
PostgreSQL database helpers for portfolio CMS.
"""
import os
import json
import psycopg2
import psycopg2.extras
from werkzeug.security import generate_password_hash, check_password_hash

def get_db():
    url = os.getenv('DATABASE_URL')
    if not url:
        raise RuntimeError('DATABASE_URL environment variable is not set')
    if 'sslmode' not in url:
        url += ('&' if '?' in url else '?') + 'sslmode=disable'
    conn = psycopg2.connect(url)
    conn.autocommit = False
    return conn


DEFAULT_CONTENT = {
    'hero': {
        'name': 'Sasu Isaac Osafo',
        'eyebrow': 'Designing the future',
        'title': 'Digital products with a human heartbeat.',
        'typed_items': ['Full-Stack Developer', 'Backend Engineer', 'Python Developer', 'UI/UX Designer', 'Freelancer'],
        'stats': [
            {'num': '3+', 'label': 'Years coding'},
            {'num': '10+', 'label': 'Projects built'},
        ],
    },
    'about': {
        'bio': [
            "I'm a Full-Stack Developer passionate about architecting resilient backend systems, exploring AI, and crafting efficient digital experiences that feel effortless for the people who use them.",
            "Skilled in Python with 3+ years of hands-on experience, I've created impactful products like SourceScout—an AI research assistant built to help students accelerate academic discovery and learn with confidence.",
        ],
        'photo_url': '/assets/images/sasu.jpg',
        'caption': 'Sasu Isaac Osafo — Full-Stack Developer',
    },
    'capabilities': [
        {'title': 'Product vision', 'desc': 'North-star narratives, strategic framing, and design roadmaps that keep teams aligned.', 'items': ['Vision storytelling', 'Design strategy', 'Executive workshops']},
        {'title': 'Experience design', 'desc': 'Signature interactions, adaptive systems, and accessibility from day zero.', 'items': ['Design systems', 'Prototyping', 'Motion direction']},
        {'title': 'Product stewardship', 'desc': 'Cross-functional leadership from launch to iteration with empathy-driven decision making.', 'items': ['Design operations', 'Design to dev handoff', 'Measured experimentation']},
    ],
    'resume': {
        'summary': 'Sasu Isaac Osafo — Full-stack web developer passionate about system architecture, resilient back-end services, and exploring AI. Skilled in Python with 3+ years of hands-on experience.',
        'location': 'Ghana',
        'email': 'sasuisaac332@gmail.com',
        'education': [
            {'year': '2024 — 2027', 'role': 'Bachelor of Science in Computer Science · Valley View University', 'note': 'Currently a Level 300 student. Focus areas: Python, Flask, SQL.'},
        ],
        'experience': [
            {'year': '2025 — Present', 'role': 'Backend Developer Intern · Presto Solutions Ghana', 'url': 'https://prestoghana.com', 'note': 'Contributing to back-end services and integrations; collaborating on product features and reliability work.'},
            {'year': '2024 — Present', 'role': 'Full-Stack Developer · Freelance', 'url': '', 'note': 'End-to-end delivery of web applications, from API design to UI polish; projects in Python/Flask and JavaScript.'},
        ],
        'skills': [
            {'name': 'Python', 'value': 95},
            {'name': 'JavaScript', 'value': 90},
            {'name': 'HTML', 'value': 93},
            {'name': 'CSS', 'value': 92},
            {'name': 'C++', 'value': 82},
            {'name': 'C#', 'value': 80},
            {'name': 'Java', 'value': 84},
            {'name': 'UX Design', 'value': 88},
            {'name': 'SQL', 'value': 87},
            {'name': 'NoSQL', 'value': 85},
        ],
    },
    'testimonials': [
        {'quote': 'Sasu delivered our backend integrations on time with clean, well-documented code. A reliable developer who communicates well throughout the process.', 'author': 'Colleague, Presto Solutions Ghana'},
        {'quote': 'Working with Sasu felt effortless. He understood our vision quickly and turned it into a polished product. Will absolutely collaborate again.', 'author': 'Freelance Client, Ghana'},
        {'quote': 'SourceScout changed how I do research for assignments. The interface is clean and the AI suggestions are genuinely helpful.', 'author': 'Student, Valley View University'},
    ],
    'contact': {
        'email': 'sasuisaac332@gmail.com',
        'phone': '+233 201142183',
        'whatsapp': 'https://wa.me/233201142183',
        'location': 'Ghana',
    },
    'cv_url': '',
}


def init_db():
    """Create tables and seed defaults."""
    with get_db() as conn:
        with conn.cursor() as cur:
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
            cur.execute('''
                CREATE TABLE IF NOT EXISTS admins (
                    id            SERIAL PRIMARY KEY,
                    username      TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL
                )
            ''')
            cur.execute('''
                CREATE TABLE IF NOT EXISTS site_content (
                    key        TEXT PRIMARY KEY,
                    value      TEXT NOT NULL,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            ''')
            # Seed admin
            cur.execute('SELECT COUNT(*) FROM admins')
            if cur.fetchone()[0] == 0:
                cur.execute(
                    'INSERT INTO admins (username, password_hash) VALUES (%s, %s)',
                    ('sasusavage', generate_password_hash('nbaSavage123$'))
                )
            # Seed default content
            for key, value in DEFAULT_CONTENT.items():
                cur.execute(
                    'INSERT INTO site_content (key, value) VALUES (%s, %s) ON CONFLICT (key) DO NOTHING',
                    (key, json.dumps(value))
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


# ── Site content ─────────────────────────────────────────────────────────────

def get_all_content():
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute('SELECT key, value FROM site_content')
            rows = cur.fetchall()
    return {row['key']: json.loads(row['value']) for row in rows}


def get_content(key):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT value FROM site_content WHERE key = %s', (key,))
            row = cur.fetchone()
    return json.loads(row[0]) if row else None


def set_content(key, value):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                '''INSERT INTO site_content (key, value, updated_at)
                   VALUES (%s, %s, NOW())
                   ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()''',
                (key, json.dumps(value))
            )
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
