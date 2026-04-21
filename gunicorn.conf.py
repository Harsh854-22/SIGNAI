import os

# Render dynamically assigns a PORT, if not, default to 5000
port = os.environ.get('PORT', '5000')
bind = f'0.0.0.0:{port}'

# Use the gevent worker class required by Flask-SocketIO on newer Pythons
worker_class = 'geventwebsocket.gunicorn.workers.GeventWebSocketWorker'

# Ensure a single worker for WebSocket consistency
workers = 1

# Optional: increase timeout for long polling requests
timeout = 120
