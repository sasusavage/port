import os

from backend.app import app


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5006))
    debug = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
