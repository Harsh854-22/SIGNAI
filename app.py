import socket
# Import the expanded phrases
from asl_phrases import asl_phrases, phrase_complexity
import os
import cv2
import numpy as np
import base64
import json
import logging
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import mediapipe as mp
import threading
import time
import queue
import concurrent.futures
import eventlet

# Use eventlet for better WebSocket performance
eventlet.monkey_patch()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = 'signai_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Initialize MediaPipe solutions
mp_hands = mp.solutions.hands
mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils

# Initialize models
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Store client sessions
client_sessions = {}

# Create a thread pool for parallel processing
executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

# Processing queue for each client
processing_queues = {}

# Nod detection class
class HeadPoseDetector:
    def __init__(self):
        self.previous_y = None
        self.moving_down = False
        self.moving_up = False
        self.nod_count = 0
        self.frame_count = 0
        self.last_nod_time = 0
        self.NOD_THRESHOLD = 15
        self.NOD_FRAMES = 5
    
    def reset(self):
        self.previous_y = None
        self.moving_down = False
        self.moving_up = False
        self.nod_count = 0
        self.frame_count = 0
    
    def process_landmarks(self, face_landmarks):
        if not face_landmarks or len(face_landmarks) < 1:
            return False
        
        # Use nose tip as reference point
        nose_tip = face_landmarks[4]  # Assuming index 4 is the nose tip
        current_y = nose_tip[1]
        
        # Initialize previous Y if not set
        if self.previous_y is None:
            self.previous_y = current_y
            return False
        
        # Calculate vertical movement
        vertical_movement = current_y - self.previous_y
        
        # Detect downward movement (nod down)
        if vertical_movement > self.NOD_THRESHOLD and not self.moving_down:
            self.moving_down = True
            self.moving_up = False
        # Detect upward movement (nod up)
        elif vertical_movement < -self.NOD_THRESHOLD and not self.moving_up and self.moving_down:
            self.moving_up = True
            self.moving_down = False
            self.nod_count += 1
        # Reset if movement is minimal
        elif abs(vertical_movement) < self.NOD_THRESHOLD / 2:
            self.moving_down = False
            self.moving_up = False
        
        # Update previous Y position
        self.previous_y = current_y
        
        # Increment frame count
        self.frame_count += 1
        
        # Check if we have detected a nod
        if self.nod_count >= 1 and self.frame_count > self.NOD_FRAMES:
            # Prevent rapid consecutive nods
            current_time = time.time()
            if current_time - self.last_nod_time > 1:
                self.last_nod_time = current_time
                self.reset()
                return True
        
        # Reset if too many frames without a complete nod
        if self.frame_count > 30:
            self.reset()
        
        return False

# Gesture classifier
def gesture_classifier(landmarks):
    if not landmarks or len(landmarks) < 21:
        return "", 0
    
    # Extract key points for classification
    thumb = landmarks[4]
    index_finger = landmarks[8]
    middle_finger = landmarks[12]
    ring_finger = landmarks[16]
    pinky_finger = landmarks[20]
    wrist = landmarks[0]
    
    # Calculate distances for classification
    thumb_index_distance = distance(thumb, index_finger)
    index_middle_distance = distance(index_finger, middle_finger)
    middle_ring_distance = distance(middle_finger, ring_finger)
    ring_pinky_distance = distance(ring_finger, pinky_finger)
    
    # Calculate finger heights relative to wrist
    thumb_height = thumb[1] - wrist[1]
    index_height = index_finger[1] - wrist[1]
    middle_height = middle_finger[1] - wrist[1]
    ring_height = ring_finger[1] - wrist[1]
    pinky_height = pinky_finger[1] - wrist[1]
    
    # Calculate horizontal positions relative to wrist
    thumb_x = thumb[0] - wrist[0]
    index_x = index_finger[0] - wrist[0]
    
    # Calculate finger curvatures
    index_curvature = calculate_curvature(landmarks, 5, 6, 7, 8)
    middle_curvature = calculate_curvature(landmarks, 9, 10, 11, 12)
    ring_curvature = calculate_curvature(landmarks, 13, 14, 15, 16)
    pinky_curvature = calculate_curvature(landmarks, 17, 18, 19, 20)
    
    # Gesture classification logic
    gesture = ""
    confidence = 0
    
    # Thumbs up
    if (
        thumb_height < -50 and
        index_height > -20 and
        middle_height > -20 and
        ring_height > -20 and
        pinky_height > -20 and
        thumb_x < 0
    ):
        gesture = "thumbs_up"
        confidence = 0.9
    
    # Thumbs down
    elif (
        thumb_height > 50 and
        index_height > -20 and
        middle_height > -20 and
        ring_height > -20 and
        pinky_height > -20 and
        thumb_x < 0
    ):
        gesture = "thumbs_down"
        confidence = 0.9
    
    # Open palm / Hello
    elif (
        index_middle_distance > 30 and
        middle_ring_distance > 30 and
        ring_pinky_distance > 30 and
        thumb_index_distance > 30 and
        index_height < -50 and
        middle_height < -50 and
        ring_height < -50 and
        pinky_height < -50 and
        abs(index_height - pinky_height) < 30
    ):
        gesture = "open_palm"
        confidence = 0.85
    
    # Victory sign
    elif (
        index_height < -50 and
        middle_height < -50 and
        ring_height > -20 and
        pinky_height > -20 and
        index_middle_distance > 30 and
        middle_ring_distance > 50 and
        index_curvature < 0.3 and
        middle_curvature < 0.3
    ):
        gesture = "victory"
        confidence = 0.9
    
    # Pointing up
    elif (
        index_height < -50 and
        middle_height > -20 and
        ring_height > -20 and
        pinky_height > -20 and
        thumb_index_distance > 30 and
        index_curvature < 0.3
    ):
        gesture = "pointing_up"
        confidence = 0.85
    
    # Fist / Stop
    elif (
        index_height > -20 and
        middle_height > -20 and
        ring_height > -20 and
        pinky_height > -20 and
        thumb_height > -20 and
        index_curvature > 0.5 and
        middle_curvature > 0.5 and
        ring_curvature > 0.5 and
        pinky_curvature > 0.5
    ):
        gesture = "fist"
        confidence = 0.8
    
    # OK sign
    elif (
        distance(thumb, index_finger) < 30 and
        middle_height < -40 and
        ring_height < -40 and
        pinky_height < -40 and
        middle_curvature < 0.3 and
        ring_curvature < 0.3 and
        pinky_curvature < 0.3
    ):
        gesture = "ok_sign"
        confidence = 0.85
    
    # Pointing index (I/Me)
    elif (
        index_height < -40 and
        middle_height > -20 and
        ring_height > -20 and
        pinky_height > -20 and
        thumb_height > -20 and
        index_curvature < 0.3 and
        middle_curvature > 0.5 and
        ring_curvature > 0.5 and
        pinky_curvature > 0.5
    ):
        gesture = "pointing_index"
        confidence = 0.8
    
    # Wave (simplified detection)
    elif (
        index_height < -30 and
        middle_height < -30 and
        ring_height < -30 and
        pinky_height < -30 and
        abs(index_height - pinky_height) > 20 and
        index_curvature < 0.4 and
        middle_curvature < 0.4 and
        ring_curvature < 0.4 and
        pinky_curvature < 0.4
    ):
        gesture = "wave"
        confidence = 0.75
    
    # Spread fingers / Five / Help
    elif (
        index_middle_distance > 25 and
        middle_ring_distance > 25 and
        ring_pinky_distance > 25 and
        thumb_index_distance > 25 and
        index_height < -30 and
        middle_height < -30 and
        ring_height < -30 and
        pinky_height < -30 and
        index_curvature < 0.3 and
        middle_curvature < 0.3 and
        ring_curvature < 0.3 and
        pinky_curvature < 0.3
    ):
        gesture = "spread_fingers"
        confidence = 0.8
    
    # Pinch (A little bit)
    elif (
        distance(thumb, index_finger) < 20 and
        distance(thumb, middle_finger) > 40 and
        distance(thumb, ring_finger) > 40 and
        distance(thumb, pinky_finger) > 40
    ):
        gesture = "pinch"
        confidence = 0.75
    
    # One sign
    elif (
        index_height < -40 and
        middle_height > -20 and
        ring_height > -20 and
        pinky_height > -20 and
        index_curvature < 0.3
    ):
        gesture = "one_sign"
        confidence = 0.85
    
    # Two sign (same as victory but different name)
    elif (
        index_height < -40 and
        middle_height < -40 and
        ring_height > -20 and
        pinky_height > -20 and
        index_curvature < 0.3 and
        middle_curvature < 0.3
    ):
        gesture = "two_sign"
        confidence = 0.85
    
    # Three sign
    elif (
        index_height < -40 and
        middle_height < -40 and
        ring_height < -40 and
        pinky_height > -20 and
        index_curvature < 0.3 and
        middle_curvature < 0.3 and
        ring_curvature < 0.3
    ):
        gesture = "three_sign"
        confidence = 0.85
    
    # Four sign
    elif (
        index_height < -40 and
        middle_height < -40 and
        ring_height < -40 and
        pinky_height < -40 and
        thumb_height > -20 and
        index_curvature < 0.3 and
        middle_curvature < 0.3 and
        ring_curvature < 0.3 and
        pinky_curvature < 0.3
    ):
        gesture = "four_sign"
        confidence = 0.85
    
    # Five sign (same as spread fingers but different name)
    elif (
        index_height < -40 and
        middle_height < -40 and
        ring_height < -40 and
        pinky_height < -40 and
        thumb_height < -20 and
        index_curvature < 0.3 and
        middle_curvature < 0.3 and
        ring_curvature < 0.3 and
        pinky_curvature < 0.3
    ):
        gesture = "five_sign"
        confidence = 0.85
    
    return gesture, confidence

# Helper function to calculate distance between two points
def distance(point1, point2):
    return np.sqrt(np.power(point1[0] - point2[0], 2) + np.power(point1[1] - point2[1], 2))

# Helper function to calculate finger curvature
def calculate_curvature(landmarks, base, joint1, joint2, tip):
    base_point = landmarks[base]
    joint1_point = landmarks[joint1]
    joint2_point = landmarks[joint2]
    tip_point = landmarks[tip]
    
    # Calculate the straight-line distance from base to tip
    direct_distance = distance(base_point, tip_point)
    
    # Calculate the path distance along the finger joints
    path_distance = (
        distance(base_point, joint1_point) +
        distance(joint1_point, joint2_point) +
        distance(joint2_point, tip_point)
    )
    
    # Normalize the curvature value between 0 and 1
    # 0 means straight, 1 means fully curved
    if path_distance == 0:
        return 0
    curvature = 1 - (direct_distance / path_distance)
    
    return curvature

# Check camera calibration
def check_camera_calibration(frame):
    if frame is None:
        return {
            "isGood": False,
            "brightness": 0,
            "contrast": 0,
            "issues": ["Frame is empty"]
        }
    
    # Calculate brightness
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    brightness = np.mean(gray)
    
    # Calculate contrast
    contrast = np.std(gray)
    
    # Identify issues
    issues = []
    
    if brightness < 50:
        issues.append("Low lighting detected. Please move to a brighter area.")
    elif brightness > 200:
        issues.append("Overexposed image. Please reduce lighting or adjust camera.")
    
    if contrast < 20:
        issues.append("Low contrast detected. Try adjusting lighting or background.")
    
    return {
        "isGood": len(issues) == 0,
        "brightness": int(brightness * 100 / 255),
        "contrast": int(contrast * 100 / 255),
        "issues": issues
    }

# Process frame
def process_frame(frame, session_id, show_hand_landmarks=True, show_face_landmarks=False):
    if frame is None:
        return None, None, None, None, None
    
    # Resize frame for faster processing
    frame = cv2.resize(frame, (320, 240))
    
    # Convert frame to RGB for MediaPipe
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process with MediaPipe Hands
    hand_results = hands.process(rgb_frame)
    
    # Process with MediaPipe Face Mesh
    face_results = face_mesh.process(rgb_frame)
    
    # Create a copy for drawing
    annotated_frame = frame.copy()
    
    # Initialize variables
    gesture = ""
    confidence = 0
    nod_detected = False
    
    # Process hand landmarks if detected
    if hand_results.multi_hand_landmarks:
        hand_landmarks = hand_results.multi_hand_landmarks[0]
        
        # Draw hand landmarks if enabled
        if show_hand_landmarks:
            mp_drawing.draw_landmarks(
                annotated_frame,
                hand_landmarks,
                mp_hands.HAND_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2)
            )
        
        # Convert landmarks to list format
        landmarks = []
        for landmark in hand_landmarks.landmark:
            h, w, _ = frame.shape
            x, y = int(landmark.x * w), int(landmark.y * h)
            landmarks.append([x, y, landmark.z])
        
        # Classify gesture
        gesture, confidence = gesture_classifier(landmarks)
    
    # Process face landmarks if detected
    if face_results.multi_face_landmarks:
        face_landmarks = face_results.multi_face_landmarks[0]
        
        # Draw face landmarks if enabled
        if show_face_landmarks:
            mp_drawing.draw_landmarks(
                annotated_frame,
                face_landmarks,
                mp_face_mesh.FACEMESH_CONTOURS,
                mp_drawing.DrawingSpec(color=(80, 110, 10), thickness=1, circle_radius=1),
                mp_drawing.DrawingSpec(color=(80, 256, 121), thickness=1)
            )
        
        # Convert landmarks to list format for nod detection
        face_points = []
        for landmark in face_landmarks.landmark:
            h, w, _ = frame.shape
            x, y = int(landmark.x * w), int(landmark.y * h)
            face_points.append([x, y, landmark.z])
        
        # Check for nod
        if session_id in client_sessions:
            nod_detected = client_sessions[session_id]['head_pose_detector'].process_landmarks(face_points)
    
    # Check camera calibration
    calibration = check_camera_calibration(frame)
    
    # Resize back to original size for display
    annotated_frame = cv2.resize(annotated_frame, (640, 480))
    
    return annotated_frame, gesture, confidence, nod_detected, calibration

# Worker function to process frames in the queue
def process_frames_worker(session_id):
    while session_id in client_sessions and client_sessions[session_id]['active']:
        try:
            # Get a frame from the queue with a timeout
            frame_data = processing_queues[session_id].get(timeout=1.0)
            
            # Process the frame
            annotated_frame, gesture, confidence, nod_detected, calibration = process_frame(
                frame_data['frame'], 
                session_id,
                frame_data.get('showHandLandmarks', True),
                frame_data.get('showFaceLandmarks', False)
            )
            
            if annotated_frame is None:
                continue
            
            # Determine confidence level for UI
            confidence_level = "medium"
            if confidence > 0.9:
                confidence_level = "high"
            elif confidence < 0.8:
                confidence_level = "low"
            
            # Handle translation
            translation = ""
            if gesture and gesture in asl_phrases:
                # If nod is detected, increase confidence
                if nod_detected:
                    confidence_level = "high"
                    translation = asl_phrases[gesture]
                    client_sessions[session_id]['pending_confirmation'] = None
                # If confidence is low or medium, set as pending confirmation
                elif confidence_level != "high":
                    client_sessions[session_id]['pending_confirmation'] = gesture
                    translation = asl_phrases[gesture]
                # If confidence is high, translate directly
                else:
                    translation = asl_phrases[gesture]
                
                # Add to translation history if it's a new translation
                if translation:
                    # Check if this is a new translation or a high confidence one
                    last_translation = None
                    if client_sessions[session_id]['translation_history']:
                        last_translation = client_sessions[session_id]['translation_history'][-1]['text']
                    
                    if last_translation != translation or confidence_level == 'high':
                        client_sessions[session_id]['translation_history'].append({
                            'text': translation,
                            'timestamp': time.time(),
                            'confidence': confidence_level
                        })
            
            # Encode the annotated frame to send back
            _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            annotated_image = base64.b64encode(buffer).decode('utf-8')
            
            # Send results back to client
            socketio.emit('processed_frame', {
                'image': f"data:image/jpeg;base64,{annotated_image}",
                'gesture': gesture,
                'translation': translation,
                'confidence': confidence_level,
                'nod_detected': nod_detected,
                'pending_confirmation': client_sessions[session_id]['pending_confirmation'],
                'calibration': calibration
            }, room=session_id)
            
        except queue.Empty:
            # Queue is empty, just continue
            continue
        except Exception as e:
            logger.error(f"Error processing frame: {e}")
            continue

# Routes
@app.route('/')
def index():
    return render_template('index.html')

# Feedback route
@app.route('/submit_feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.json
        feedback_type = data.get('feedbackType')
        email = data.get('email', '')
        feedback_text = data.get('feedback', '')
        
        # In a real app, you would save this to a database
        logger.info(f"Feedback received: {feedback_type} from {email}: {feedback_text}")
        
        # Save to a simple text file for now
        with open('feedback.txt', 'a') as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {feedback_type} from {email}: {feedback_text}\n")
        
        return jsonify({"success": True, "message": "Feedback submitted successfully"})
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        return jsonify({"success": False, "message": "Error submitting feedback"}), 500

# Socket events
@socketio.on('connect')
def handle_connect():
    session_id = request.sid
    logger.info(f"Client connected: {session_id}")
    client_sessions[session_id] = {
        'head_pose_detector': HeadPoseDetector(),
        'pending_confirmation': None,
        'last_gesture': None,
        'translation_history': [],
        'active': True
    }
    processing_queues[session_id] = queue.Queue(maxsize=2)  # Limit queue size to prevent memory issues
    
    # Start a worker thread for this client
    worker_thread = threading.Thread(target=process_frames_worker, args=(session_id,))
    worker_thread.daemon = True
    worker_thread.start()
    
    emit('connected', {
        'session_id': session_id,
        'phrases': asl_phrases,
        'phrase_complexity': phrase_complexity
    })

@socketio.on('disconnect')
def handle_disconnect():
    session_id = request.sid
    logger.info(f"Client disconnected: {session_id}")
    if session_id in client_sessions:
        client_sessions[session_id]['active'] = False
        del client_sessions[session_id]
    if session_id in processing_queues:
        del processing_queues[session_id]

@socketio.on('frame')
def handle_frame(data):
    session_id = request.sid
    if session_id not in client_sessions:
        return
    
    # Decode base64 image
    try:
        image_data = data['image'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        # Add to processing queue, drop if queue is full
        try:
            if not processing_queues[session_id].full():
                processing_queues[session_id].put({
                    'frame': frame,
                    'showHandLandmarks': data.get('showHandLandmarks', True),
                    'showFaceLandmarks': data.get('showFaceLandmarks', False)
                }, block=False)
            
        except queue.Full:
            # Queue is full, skip this frame
            pass
            
    except Exception as e:
        logger.error(f"Error decoding image: {e}")
        return

@socketio.on('get_translation_history')
def handle_get_translation_history():
    session_id = request.sid
    if session_id in client_sessions:
        emit('translation_history', {
            'history': client_sessions[session_id]['translation_history']
        })

@socketio.on('export_translations')
def handle_export_translations():
    session_id = request.sid
    if session_id in client_sessions:
        history = client_sessions[session_id]['translation_history']
        formatted_history = []
        for entry in history:
            timestamp = time.strftime('%H:%M:%S', time.localtime(entry['timestamp']))
            formatted_history.append(f"[{timestamp}] {entry['text']}")
        
        export_text = '\n'.join(formatted_history)
        emit('export_result', {
            'text': export_text,
            'filename': f"SignAI_Translation_{time.strftime('%Y-%m-%d')}.txt"
        })

@socketio.on('get_phrases')
def handle_get_phrases():
    emit('phrases_data', {
        'phrases': asl_phrases,
        'phrase_complexity': phrase_complexity
    })

def find_available_port(start_port=5000, max_attempts=10):
    """Find an available port starting from start_port"""
    port = start_port
    attempts = 0
    while attempts < max_attempts:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(('0.0.0.0', port))
            sock.close()
            return port
        except OSError:
            port += 1
            attempts += 1
    raise RuntimeError(f"Could not find available port after {max_attempts} attempts")

if __name__ == '__main__':
    port = find_available_port()
    print(f"Starting server on port {port}")
    
    try:
        with app.app_context():
            socketio.run(app, host='0.0.0.0', port=port, debug=True)
    except Exception as e:
        print(f"Server error: {e}")
    finally:
        # Clean up resources
        hands.close()
        face_mesh.close()
        executor.shutdown(wait=False)
