# Portfolio Backend - Telegram Contact Form

A simple Flask backend that receives contact form submissions and forwards them to your Telegram.

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the **Bot Token** you receive

### 2. Get Your Chat ID

1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. It will reply with your **Chat ID**

### 3. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your credentials:
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

### 4. Install & Run Locally

```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

The API will be available at `http://localhost:5000`

### 5. Test the API

```bash
curl -X POST http://localhost:5000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Hello","message":"Testing!"}'
```

## Deployment Options

### Render.com (Free tier available)
1. Create a new Web Service
2. Connect your GitHub repo
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `gunicorn app:app`
5. Add environment variables in the dashboard

### Railway.app
1. Connect your GitHub repo
2. Add environment variables
3. Deploy automatically

### Vercel (with serverless adapter)
Requires converting to serverless function format.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contact` | POST | Submit contact form |
| `/api/health` | GET | Health check |

## Frontend Integration

Update `BACKEND_URL` in `assets/js/main.js` with your deployed URL:

```javascript
const BACKEND_URL = 'https://your-backend.onrender.com';
```
