from app import app, socketio

# Expose the Flask application as the WSGI callable
application = app

# Optional: If you need to explicitly initialize SocketIO with the application
# This might be necessary depending on your setup
socketio.init_app(application)

if __name__ == "__main__":
    socketio.run(application)
