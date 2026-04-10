"""
Flask backend for portfolio — contact form + CMS admin.
"""
import os
import uuid
import requests
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from dotenv import load_dotenv
from backend.database import (
    init_db, get_all_projects, get_project, create_project,
    update_project, delete_project, reorder_projects, verify_admin,
    get_all_content, get_content, set_content
)

# Load .env first so os.getenv calls below pick up the values
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(ENV_PATH)

# Base paths
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')

# Upload directory: set UPLOAD_DIR in env to your Coolify persistent storage
# mount path (e.g. /data/uploads). Falls back to assets/images/uploads locally.
UPLOADS_DIR = os.getenv('UPLOAD_DIR', os.path.join(ASSETS_DIR, 'images', 'uploads'))

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', os.urandom(24).hex())
CORS(app)

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

os.makedirs(UPLOADS_DIR, exist_ok=True)
init_db()


# ── Helpers ──────────────────────────────────────────────────────────────────

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated


def send_telegram_message(message: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "HTML"},
            timeout=10
        )
        r.raise_for_status()
        return True
    except requests.RequestException as e:
        print(f"Telegram error: {e}")
        return False


# ── Static files ─────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/assets/<path:filename>')
def assets(filename):
    return send_from_directory(ASSETS_DIR, filename)

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """Serve uploaded images from persistent storage."""
    return send_from_directory(UPLOADS_DIR, filename)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(ASSETS_DIR, 'favicon'), 'favicon.ico')

@app.route('/sitemap.xml')
def sitemap():
    return send_from_directory(BASE_DIR, 'sitemap.xml', mimetype='application/xml')

@app.route('/robots.txt')
def robots():
    return send_from_directory(BASE_DIR, 'robots.txt', mimetype='text/plain')

@app.route('/admin')
def admin():
    return send_from_directory(BASE_DIR, 'admin.html')


# ── Public API ────────────────────────────────────────────────────────────────

@app.route('/api/projects', methods=['GET'])
def api_projects():
    return jsonify(get_all_projects())

@app.route('/api/content', methods=['GET'])
def api_content():
    """Return all site content sections for the frontend."""
    return jsonify(get_all_content())


@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "telegram_configured": bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)})


# ── Admin auth ────────────────────────────────────────────────────────────────

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if username and verify_admin(username, password):
        session['admin'] = True
        session['username'] = username
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid username or password'}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin', None)
    return jsonify({'success': True})

@app.route('/api/admin/check')
def admin_check():
    return jsonify({'authenticated': bool(session.get('admin'))})


# ── Admin CRUD ────────────────────────────────────────────────────────────────

@app.route('/api/admin/projects', methods=['GET'])
@admin_required
def admin_list_projects():
    return jsonify(get_all_projects())


@app.route('/api/admin/projects', methods=['POST'])
@admin_required
def admin_create_project():
    data = request.get_json() or {}
    pid = create_project(
        title       = data.get('title', 'Untitled'),
        description = data.get('description', ''),
        image_url   = data.get('image_url', ''),
        project_url = data.get('project_url', ''),
        tags        = data.get('tags', []),
        order_index = data.get('order_index', 0),
    )
    return jsonify(get_project(pid)), 201


@app.route('/api/admin/projects/<int:pid>', methods=['PUT'])
@admin_required
def admin_update_project(pid):
    data = request.get_json() or {}
    if not get_project(pid):
        return jsonify({'error': 'Not found'}), 404
    update_project(
        project_id  = pid,
        title       = data.get('title', ''),
        description = data.get('description', ''),
        image_url   = data.get('image_url', ''),
        project_url = data.get('project_url', ''),
        tags        = data.get('tags', []),
        order_index = data.get('order_index', 0),
    )
    return jsonify(get_project(pid))


@app.route('/api/admin/projects/<int:pid>', methods=['DELETE'])
@admin_required
def admin_delete_project(pid):
    if not get_project(pid):
        return jsonify({'error': 'Not found'}), 404
    delete_project(pid)
    return jsonify({'success': True})


@app.route('/api/admin/projects/reorder', methods=['POST'])
@admin_required
def admin_reorder():
    data = request.get_json() or {}
    reorder_projects(data.get('ids', []))
    return jsonify({'success': True})

@app.route('/api/admin/content/<key>', methods=['POST'])
@admin_required
def admin_set_content(key):
    """Save a site content section."""
    data = request.get_json()
    if data is None:
        return jsonify({'error': 'No data'}), 400
    set_content(key, data)
    return jsonify({'success': True, 'key': key})

@app.route('/api/admin/upload/cv', methods=['POST'])
@admin_required
def admin_upload_cv():
    """Upload CV PDF."""
    if 'cv' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['cv']
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF files allowed'}), 400
    filepath = os.path.join(UPLOADS_DIR, 'cv.pdf')
    file.save(filepath)
    cv_url = '/uploads/cv.pdf'
    set_content('cv_url', cv_url)
    return jsonify({'url': cv_url})


# ── Image upload ──────────────────────────────────────────────────────────────

@app.route('/api/admin/upload', methods=['POST'])
@admin_required
def admin_upload():
    if 'image' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['image']
    if not file.filename or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Use PNG, JPG, GIF, or WebP.'}), 400
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(UPLOADS_DIR, filename))
    return jsonify({'url': f'/uploads/{filename}'})


# ── Contact form ──────────────────────────────────────────────────────────────

@app.route('/api/contact', methods=['POST'])
def contact():
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "No data received"}), 400
    name    = data.get('name', '').strip()
    email   = data.get('email', '').strip()
    phone   = data.get('phone', '').strip()
    subject = data.get('subject', '').strip()
    message = data.get('message', '').strip()
    if not name or not message:
        return jsonify({"success": False, "error": "Name and message are required"}), 400
    msg = (
        "📬 <b>New Portfolio Contact</b>\n\n"
        f"<b>Name:</b> {name}\n"
        f"<b>Email:</b> {email or 'Not provided'}\n"
        f"<b>Phone:</b> {phone or 'Not provided'}\n"
        f"<b>Subject:</b> {subject or 'No subject'}\n\n"
        f"<b>Message:</b>\n{message}"
    )
    if send_telegram_message(msg):
        return jsonify({"success": True, "message": "Message sent successfully!"})
    return jsonify({"success": False, "error": "Failed to send message. Please try again."}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5006))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
