from flask import Blueprint, jsonify, request, Response
import cv2
import numpy as np
import os
import json
import time
from datetime import datetime
import base64
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
face_enrollment_bp = Blueprint('face_enrollment', __name__)

# Global variables for face enrollment
enrollment_active = False
current_student = None
samples_collected = 0
total_samples_needed = 15
enrollment_data = {
    'embeddings': [],
    'timestamps': [],
    'quality_scores': []
}
camera = None

class YuNetFaceDetector:
    """Modern face detector using YuNet from OpenCV"""
    def __init__(self, model_path=None):
        # Try to find YuNet model file
        if model_path is None:
            # Common paths where YuNet model might be located
            possible_paths = [
                "face_detection_yunet_2023mar.onnx",
                "models/face_detection_yunet_2023mar.onnx",
                "yunet.onnx",
                "/usr/share/opencv4/models/face_detection_yunet_2023mar.onnx"
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    model_path = path
                    break
            else:
                # Download path - will need to download if not found
                model_path = "face_detection_yunet_2023mar.onnx"
                logger.warning(f"YuNet model not found locally. Will need to download to: {model_path}")
        
        self.model_path = model_path
        self.detector = None
        self.input_size = (320, 320)  # Standard input size for YuNet
        self._initialize_detector()
    
    def _initialize_detector(self):
        """Initialize YuNet detector"""
        try:
            # Create YuNet detector
            self.detector = cv2.FaceDetectorYN.create(
                model=self.model_path,
                config="",
                input_size=self.input_size,
                score_threshold=0.8,  # Confidence threshold
                nms_threshold=0.3,    # Non-maximum suppression threshold
                top_k=5000,           # Keep top k faces
                backend_id=cv2.dnn.DNN_BACKEND_DEFAULT,
                target_id=cv2.dnn.DNN_TARGET_CPU
            )
            logger.info("✅ YuNet face detector initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize YuNet: {str(e)}")
            logger.info("📥 Please download the YuNet model:")
            logger.info("🔗 https://github.com/opencv/opencv_zoo/blob/master/models/face_detection_yunet/face_detection_yunet_2023mar.onnx")
            self.detector = None
    
    def detect_faces(self, frame):
        """Detect faces in frame using YuNet"""
        try:
            if self.detector is None:
                self._initialize_detector()
                if self.detector is None:
                    return self._get_fallback_result()
            
            # Resize frame for consistent detection
            h, w = frame.shape[:2]
            self.detector.setInputSize((w, h))
            
            # Detect faces
            results, faces = self.detector.detect(frame)
            
            faces_detected = 0
            face_results = []
            
            if faces is not None:
                faces_detected = len(faces)
                
                for face in faces:
                    # YuNet returns: [x1, y1, w, h, confidence, landmarks...]
                    x, y, w, h = int(face[0]), int(face[1]), int(face[2]), int(face[3])
                    confidence = float(face[4])
                    
                    # Ensure coordinates are within frame bounds
                    x = max(0, x)
                    y = max(0, y)
                    w = min(w, frame.shape[1] - x)
                    h = min(h, frame.shape[0] - y)
                    
                    if w > 0 and h > 0:  # Valid face region
                        quality = self._check_face_quality(frame, x, y, w, h)
                        face_results.append({
                            'region': {'x': x, 'y': y, 'w': w, 'h': h},
                            'confidence': confidence,
                            'quality': quality['overall'],
                            'quality_breakdown': quality
                        })
            
            # Sort by confidence score
            face_results.sort(key=lambda f: f['confidence'], reverse=True)
            
            if faces_detected > 0:
                best_face = face_results[0] if face_results else None
                return {
                    'face_detected': True,
                    'faces_detected': faces_detected,
                    'face_data': {
                        'faces': face_results,
                        'best_face': best_face,
                        'confidence': best_face['confidence'] if best_face else 0.8,
                        'quality': best_face['quality'] if best_face else 'poor',
                        'multiple_faces': faces_detected > 1
                    }
                }
            else:
                return {
                    'face_detected': False,
                    'faces_detected': 0,
                    'face_data': {
                        'faces': [],
                        'best_face': None,
                        'confidence': 0,
                        'quality': 'none',
                        'multiple_faces': False
                    }
                }
                
        except Exception as e:
            logger.error(f"❌ Error in YuNet face detection: {str(e)}")
            return self._get_fallback_result()
    
    def _get_fallback_result(self):
        """Return fallback result when YuNet fails"""
        return {
            'face_detected': False,
            'faces_detected': 0,
            'face_data': {
                'faces': [],
                'best_face': None,
                'confidence': 0,
                'quality': 'none',
                'multiple_faces': False
            }
        }
    
    def _check_face_quality(self, frame, x, y, w, h):
        """Check face quality based on modern metrics"""
        quality = {
            'overall': 'poor',
            'brightness': 0,
            'sharpness': 0,
            'alignment': 0,
            'size': 0,
            'pose': 0
        }
        
        try:
            # Extract face region
            face_roi = frame[y:y+h, x:x+w]
            
            if face_roi.size > 0 and face_roi.shape[0] > 10 and face_roi.shape[1] > 10:
                # Brightness check (better calculation)
                gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
                brightness = np.mean(gray_face)
                # Ideal brightness is around 127, score based on deviation
                quality['brightness'] = 1.0 - min(abs(brightness - 127) / 127, 1.0)
                
                # Sharpness check (Laplacian variance)
                sharpness = cv2.Laplacian(gray_face, cv2.CV_64F).var()
                quality['sharpness'] = min(sharpness / 500, 1.0)  # Adjusted threshold
                
                # Size check (relative to frame)
                frame_area = frame.shape[0] * frame.shape[1]
                face_area = w * h
                size_ratio = face_area / frame_area
                # Ideal face size is 10-30% of frame
                if size_ratio > 0.15:  # Good size
                    quality['size'] = 1.0
                elif size_ratio > 0.08:  # Acceptable size
                    quality['size'] = 0.7
                elif size_ratio > 0.05:  # Small but usable
                    quality['size'] = 0.4
                else:  # Too small
                    quality['size'] = 0.1
                
                # Alignment check (center-based with tolerance)
                frame_center_x = frame.shape[1] // 2
                frame_center_y = frame.shape[0] // 2
                face_center_x = x + w // 2
                face_center_y = y + h // 2
                
                # Calculate normalized distance from center (0-1, where 1 is perfect)
                max_distance = min(frame_center_x, frame_center_y)
                distance_x = abs(face_center_x - frame_center_x)
                distance_y = abs(face_center_y - frame_center_y)
                
                alignment_x = 1.0 - min(distance_x / max_distance, 1.0)
                alignment_y = 1.0 - min(distance_y / max_distance, 1.0)
                quality['alignment'] = (alignment_x + alignment_y) / 2
                
                # Simple pose estimation (aspect ratio check)
                aspect_ratio = w / h
                # Ideal aspect ratio for front-facing face is around 0.7-0.9
                if 0.6 <= aspect_ratio <= 1.0:
                    quality['pose'] = 1.0
                elif 0.5 <= aspect_ratio <= 1.2:
                    quality['pose'] = 0.7
                else:
                    quality['pose'] = 0.3
                
                # Overall quality with modern weights
                weights = {
                    'brightness': 0.15,
                    'sharpness': 0.25,
                    'size': 0.20,
                    'alignment': 0.20,
                    'pose': 0.20
                }
                
                overall_score = (
                    quality['brightness'] * weights['brightness'] +
                    quality['sharpness'] * weights['sharpness'] +
                    quality['size'] * weights['size'] +
                    quality['alignment'] * weights['alignment'] +
                    quality['pose'] * weights['pose']
                )
                
                # Quality thresholds
                if overall_score > 0.75:
                    quality['overall'] = 'excellent'
                elif overall_score > 0.6:
                    quality['overall'] = 'good'
                elif overall_score > 0.4:
                    quality['overall'] = 'fair'
                else:
                    quality['overall'] = 'poor'
            
            return quality
            
        except Exception as e:
            logger.error(f"Error in quality check: {str(e)}")
            return quality

# Initialize YuNet face detector
face_detector = YuNetFaceDetector()

def init_camera():
    """Initialize camera"""
    global camera
    try:
        camera = cv2.VideoCapture(0)
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        camera.set(cv2.CAP_PROP_FPS, 30)
        # Try to improve camera quality
        camera.set(cv2.CAP_PROP_AUTOFOCUS, 1)
        camera.set(cv2.CAP_PROP_BRIGHTNESS, 0)
        camera.set(cv2.CAP_PROP_CONTRAST, 0)
        return True
    except Exception as e:
        logger.error(f"Error initializing camera: {str(e)}")
        return False

def get_frame():
    """Get frame from camera"""
    global camera
    try:
        if camera is None:
            if not init_camera():
                return None
        
        success, frame = camera.read()
        if success:
            # Enhance frame for better detection
            frame = cv2.convertScaleAbs(frame, alpha=1.1, beta=5)  # Slight contrast enhancement
            return frame
        else:
            return None
    except Exception as e:
        logger.error(f"Error getting frame: {str(e)}")
        return None

def generate_fake_embedding():
    """Generate a fake embedding for demonstration"""
    return [np.random.randn() for _ in range(512)]  # More realistic embedding size

def calculate_embedding_quality(new_embedding, previous_embeddings):
    """Calculate embedding quality with better metrics"""
    if len(previous_embeddings) == 0:
        return 'excellent'  # First sample is always good
    
    try:
        new_embedding = np.array(new_embedding)
        previous_embeddings = np.array(previous_embeddings)
        
        # Calculate similarities with all previous embeddings
        similarities = []
        for prev_embedding in previous_embeddings:
            # Cosine similarity
            similarity = np.dot(new_embedding, prev_embedding) / (
                np.linalg.norm(new_embedding) * np.linalg.norm(prev_embedding)
            )
            similarities.append(similarity)
        
        avg_similarity = np.mean(similarities) if similarities else 0
        consistency = np.std(similarities) if similarities else 0
        
        # Quality based on average similarity and consistency
        if avg_similarity > 0.7 and consistency < 0.1:
            return 'excellent'
        elif avg_similarity > 0.6 and consistency < 0.15:
            return 'good'
        elif avg_similarity > 0.5 and consistency < 0.2:
            return 'fair'
        else:
            return 'poor'
    except:
        return 'fair'

def save_sample_image(frame, sample_number):
    """Save sample image with student name and ID in filename"""
    try:
        if current_student:
            # Create main face_data directory if it doesn't exist
            face_data_dir = "face_data"
            os.makedirs(face_data_dir, exist_ok=True)
            
            # Create filename using student information
            first_name = current_student['first_name'].replace(' ', '_')
            middle_initial = current_student.get('middle_initial', '')
            last_name = current_student['last_name'].replace(' ', '_')
            student_id = current_student['student_id']
            timestamp = int(time.time())
            
            # Format: {first_name}_{middle_initial}_{last_name}_{student_id}_sample_{number}_{timestamp}.jpg
            if middle_initial:
                filename = f"{first_name}_{middle_initial}_{last_name}_{student_id}_sample_{sample_number:02d}_{timestamp}.jpg"
            else:
                filename = f"{first_name}_{last_name}_{student_id}_sample_{sample_number:02d}_{timestamp}.jpg"
            
            filepath = os.path.join(face_data_dir, filename)
            success = cv2.imwrite(filepath, frame)
            
            if success:
                logger.info(f"💾 Saved sample image: {filepath}")
                return True
            else:
                logger.error(f"❌ Failed to save sample image: {filepath}")
                return False
        return False
    except Exception as e:
        logger.error(f"❌ Error saving sample image: {str(e)}")
        return False

# Routes
@face_enrollment_bp.route('/start-ai-face-enrollment', methods=['POST'])
def start_ai_face_enrollment():
    """Start AI face enrollment"""
    global enrollment_active, current_student, samples_collected, enrollment_data
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'})
        
        student_data = {
            'student_id': data.get('student_id', 'unknown'),
            'first_name': data.get('first_name', 'Unknown'),
            'middle_initial': data.get('middle_initial', ''),
            'last_name': data.get('last_name', 'Student')
        }
        
        # Initialize camera
        if not init_camera():
            return jsonify({'success': False, 'message': 'Failed to initialize camera'})
        
        # Reset enrollment data
        enrollment_active = True
        current_student = student_data
        samples_collected = 0
        enrollment_data = {
            'embeddings': [],
            'timestamps': [],
            'quality_scores': []
        }
        
        logger.info(f"🎯 Started AI enrollment for student: {student_data}")
        return jsonify({
            'success': True, 
            'message': 'AI Face Enrollment started successfully!'
        })
        
    except Exception as e:
        logger.error(f"❌ Error in start_ai_face_enrollment: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@face_enrollment_bp.route('/check-face-detection', methods=['GET'])
def check_face_detection():
    """Check face detection status"""
    try:
        if not enrollment_active:
            return jsonify({'success': True, 'face_detected': False})
        
        frame = get_frame()
        if frame is None:
            return jsonify({'success': False, 'face_detected': False, 'error': 'No frame available'})
        
        # Detect faces using YuNet
        detection_result = face_detector.detect_faces(frame)
        
        return jsonify({
            'success': True,
            'face_detected': detection_result['face_detected'],
            'faces_detected': detection_result['faces_detected'],
            'face_data': detection_result.get('face_data', {})
        })
        
    except Exception as e:
        logger.error(f"❌ Error in check_face_detection: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@face_enrollment_bp.route('/capture-face-sample', methods=['POST'])
def capture_face_sample():
    """Capture a face sample"""
    global samples_collected, enrollment_data
    
    try:
        if not enrollment_active:
            return jsonify({'success': False, 'message': 'Enrollment not active'})
        
        frame = get_frame()
        if frame is None:
            return jsonify({'success': False, 'message': 'No frame available'})
        
        # Check if face is detected
        detection_result = face_detector.detect_faces(frame)
        if not detection_result['face_detected']:
            return jsonify({'success': False, 'message': 'No face detected'})
        
        face_data = detection_result['face_data']
        faces_detected = detection_result['faces_detected']
        
        # PREVENT CAPTURE IF MULTIPLE FACES DETECTED
        if faces_detected > 1:
            return jsonify({
                'success': False, 
                'message': f'Multiple faces detected ({faces_detected}). Please ensure only one person is in frame.'
            })
        
        # Only proceed if exactly one face is detected
        if faces_detected == 1 and face_data['best_face']:
            best_face = face_data['best_face']
            face_quality = best_face['quality']
            
            # Only capture if quality is good or better
            if face_quality in ['excellent', 'good', 'fair']:
                # Generate fake embedding (replace with real DeepFace later)
                embedding = generate_fake_embedding()
                embedding_quality = calculate_embedding_quality(embedding, enrollment_data['embeddings'])
                
                # Save data
                enrollment_data['embeddings'].append(embedding)
                enrollment_data['timestamps'].append(datetime.now().isoformat())
                enrollment_data['quality_scores'].append({
                    'face_quality': face_quality,
                    'embedding_quality': embedding_quality
                })
                
                samples_collected += 1
                
                # Save sample image with student information
                save_sample_image(frame, samples_collected)
                
                completed = samples_collected >= total_samples_needed
                
                return jsonify({
                    'success': True,
                    'samples_collected': samples_collected,
                    'face_quality': face_quality,
                    'embedding_quality': embedding_quality,
                    'completed': completed,
                    'message': f'AI Sample {samples_collected}/{total_samples_needed} captured successfully'
                })
            else:
                return jsonify({
                    'success': False, 
                    'message': f'Face quality too low: {face_quality}. Please adjust lighting and position.'
                })
        else:
            return jsonify({
                'success': False, 
                'message': 'Face detection issue. Please try again.'
            })
            
    except Exception as e:
        logger.error(f"❌ Error in capture_face_sample: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@face_enrollment_bp.route('/get-ai-enrollment-status', methods=['GET'])
def get_ai_enrollment_status():
    """Get current enrollment status"""
    try:
        return jsonify({
            'success': True,
            'active': enrollment_active,
            'samples_collected': samples_collected,
            'total_samples_needed': total_samples_needed,
            'student': current_student
        })
    except Exception as e:
        logger.error(f"❌ Error in get_ai_enrollment_status: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@face_enrollment_bp.route('/stop-face-enrollment', methods=['POST'])
def stop_face_enrollment():
    """Stop face enrollment"""
    global enrollment_active, current_student, samples_collected, enrollment_data, camera
    
    try:
        enrollment_active = False
        current_student = None
        samples_collected = 0
        enrollment_data = {
            'embeddings': [],
            'timestamps': [],
            'quality_scores': []
        }
        
        # Release camera
        if camera:
            camera.release()
            camera = None
        
        return jsonify({'success': True, 'message': 'Enrollment stopped'})
    except Exception as e:
        logger.error(f"❌ Error in stop_face_enrollment: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

@face_enrollment_bp.route('/complete-enrollment', methods=['POST'])
def complete_enrollment():
    """Complete the enrollment process"""
    global enrollment_active, current_student, samples_collected, enrollment_data, camera
    
    try:
        if not current_student or samples_collected < 5:
            return jsonify({
                'success': False, 
                'message': 'Not enough samples collected for enrollment'
            })
        
        # Save enrollment data to main face_data directory
        enrollment_file = f"face_data/{current_student['student_id']}_enrollment_data.json"
        os.makedirs(os.path.dirname(enrollment_file), exist_ok=True)
        
        final_data = {
            'student_info': current_student,
            'embeddings': enrollment_data['embeddings'],
            'timestamps': enrollment_data['timestamps'],
            'quality_scores': enrollment_data['quality_scores'],
            'total_samples': samples_collected,
            'enrollment_date': datetime.now().isoformat()
        }
        
        with open(enrollment_file, 'w') as f:
            json.dump(final_data, f, indent=2)
        
        # Reset everything
        enrollment_active = False
        student_data = current_student
        current_student = None
        samples_collected = 0
        enrollment_data = {
            'embeddings': [],
            'timestamps': [],
            'quality_scores': []
        }
        
        if camera:
            camera.release()
            camera = None
        
        logger.info(f"🎉 Completed enrollment for student: {student_data}")
        return jsonify({
            'success': True, 
            'message': f'Face enrollment completed successfully with {final_data["total_samples"]} samples!'
        })
        
    except Exception as e:
        logger.error(f"❌ Error in complete_enrollment: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

@face_enrollment_bp.route('/enrollment-video-feed')
def enrollment_video_feed():
    """Video streaming route for enrollment"""
    def generate():
        while True:
            frame = get_frame()
            if frame is not None:
                # Detect faces and draw bounding boxes
                detection_result = face_detector.detect_faces(frame)
                
                if detection_result['face_detected']:
                    face_data = detection_result['face_data']
                    for face in face_data['faces']:
                        region = face['region']
                        confidence = face['confidence']
                        quality = face['quality']
                        
                        # Color based on quality and number of faces
                        if detection_result['faces_detected'] > 1:
                            color = (0, 0, 255)  # Red for multiple faces
                        elif quality == 'excellent':
                            color = (0, 255, 0)  # Green for excellent
                        elif quality == 'good':
                            color = (0, 255, 255)  # Yellow for good
                        else:
                            color = (0, 165, 255)  # Orange for fair/poor
                        
                        # Draw bounding box
                        cv2.rectangle(frame, 
                                    (region['x'], region['y']), 
                                    (region['x'] + region['w'], region['y'] + region['h']), 
                                    color, 2)
                        
                        # Draw label with confidence and quality
                        label = f"Face: {confidence:.2f} ({quality})"
                        cv2.putText(frame, label, 
                                  (region['x'], region['y'] - 10), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                
                # Encode frame as JPEG
                ret, buffer = cv2.imencode('.jpg', frame)
                frame_bytes = buffer.tobytes()
                
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            else:
                # Return a black frame if no camera
                black_frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(black_frame, "No Camera Feed", (50, 240), 
                          cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                ret, buffer = cv2.imencode('.jpg', black_frame)
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.03)  # ~30 FPS
    
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

def init_app(app):
    """Initialize the app with face enrollment routes"""
    app.register_blueprint(face_enrollment_bp, url_prefix='/admin')