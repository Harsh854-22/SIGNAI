import os

# Render dynamically assigns a PORT, if not, default to 5000
port = os.environ.get('PORT', '5000')
bind = f'0.0.0.0:{port}'

# Use the eventlet worker class required by Flask-SocketIO
worker_class = 'eventlet'

# Ensure a single worker for WebSocket consistency
workers = 1

# Optional: increase timeout for long polling requests
timeout = 120
