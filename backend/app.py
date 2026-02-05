"""
Flask backend for portfolio contact form.
Sends form submissions to Telegram bot.
"""
import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from frontend

# Telegram configuration from environment
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')


def send_telegram_message(message: str) -> bool:
    """Send a message to the configured Telegram chat."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️  Telegram credentials not configured")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        return True
    except requests.RequestException as e:
        print(f"❌ Telegram send failed: {e}")
        return False


@app.route('/api/contact', methods=['POST'])
def contact():
    """Handle contact form submissions."""
    data = request.get_json()

    if not data:
        return jsonify({"success": False, "error": "No data received"}), 400

    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    subject = data.get('subject', '').strip()
    message = data.get('message', '').strip()

    # Validation
    if not name or not message:
        return jsonify({"success": False, "error": "Name and message are required"}), 400

    # Format message for Telegram
    telegram_message = (
        "📬 <b>New Portfolio Contact</b>\n\n"
        f"<b>Name:</b> {name}\n"
        f"<b>Email:</b> {email or 'Not provided'}\n"
        f"<b>Phone:</b> {phone or 'Not provided'}\n"
        f"<b>Subject:</b> {subject or 'No subject'}\n\n"
        f"<b>Message:</b>\n{message}"
    )

    # Send to Telegram
    success = send_telegram_message(telegram_message)

    if success:
        return jsonify({"success": True, "message": "Message sent successfully!"})
    else:
        return jsonify({"success": False, "error": "Failed to send message. Please try again."}), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "telegram_configured": bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)})


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
