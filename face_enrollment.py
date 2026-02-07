import os
import cv2
import numpy as np
import json
import time
from datetime import datetime
import logging
from deepface import DeepFace
from flask import Flask, request, jsonify, Response, session

class FaceEnrollmentAI:
    def __init__(self):
        self.enrollment_active = False
        self.current_student = None
        self.samples_collected = 0
        self.total_samples_needed = 15
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.enrollment_data = []
        self.last_capture_time = 0
        self.capture_interval = 2  # seconds between auto-captures
        
        # Create directories
        os.makedirs('face_datasets', exist_ok=True)
        os.makedirs('temp_captures', exist_ok=True)
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def start_enrollment(self, student_data):
        """Start face enrollment for a student"""
        try:
            self.enrollment_active = True
            self.current_student = student_data
            self.samples_collected = 0
            self.enrollment_data = []
            self.last_capture_time = 0
            
            # Create student directory
            student_dir = f"face_datasets/{student_data['student_id']}"
            os.makedirs(student_dir, exist_ok=True)
            
            self.logger.info(f"Started face enrollment for {student_data['first_name']} {student_data['last_name']}")
            return True, "AI Face enrollment started successfully"
        except Exception as e:
            self.logger.error(f"Error starting enrollment: {str(e)}")
            return False, f"Error starting enrollment: {str(e)}"

    def stop_enrollment(self):
        """Stop face enrollment"""
        self.enrollment_active = False
        self.current_student = None
        self.samples_collected = 0
        self.enrollment_data = []
        return True, "Enrollment stopped"

    def analyze_face_quality(self, face_image):
        """Analyze face quality using DeepFace"""
        try:
            # Analyze face attributes
            analysis = DeepFace.analyze(face_image, actions=['emotion', 'age', 'gender'], enforce_detection=False)
            
            if isinstance(analysis, list):
                analysis = analysis[0]
            
            # Calculate quality score
            quality_score = 0.5  # Base score
            
            # Check if face is looking straight (simplified)
            if analysis.get('gender', {}).get('Man', 0) > 70 or analysis.get('gender', {}).get('Woman', 0) > 70:
                quality_score += 0.2
            
            # Check for neutral expression
            dominant_emotion = analysis.get('dominant_emotion', 'neutral')
            if dominant_emotion == 'neutral':
                quality_score += 0.3
            
            # Determine quality level
            if quality_score >= 0.7:
                return 'good', quality_score
            elif quality_score >= 0.5:
                return 'fair', quality_score
            else:
                return 'poor', quality_score
                
        except Exception as e:
            self.logger.warning(f"Face quality analysis failed: {str(e)}")
            return 'unknown', 0.3

    def auto_capture_face(self, frame):
        """Automatically capture face samples when conditions are good"""
        if not self.enrollment_active:
            return False, "Enrollment not active", 0, "poor"
        
        current_time = time.time()
        if current_time - self.last_capture_time < self.capture_interval:
            return False, "Waiting for next capture", 0, "poor"
        
        try:
            # Convert frame to grayscale for face detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = self.face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5, 
                minSize=(100, 100)
            )
            
            if len(faces) == 0:
                return False, "No face detected", 0, "poor"
            
            # Get the largest face
            faces = sorted(faces, key=lambda x: x[2] * x[3], reverse=True)
            x, y, w, h = faces[0]
            
            # Extract face region
            face_roi = frame[y:y+h, x:x+w]
            
            # Analyze face quality
            quality, confidence = self.analyze_face_quality(face_roi)
            
            # Only capture if quality is good and we have confidence
            if quality == 'good' and confidence > 0.6:
                # Save the face sample
                timestamp = int(time.time())
                filename = f"face_datasets/{self.current_student['student_id']}/sample_{timestamp}.jpg"
                cv2.imwrite(filename, face_roi)
                
                self.samples_collected += 1
                self.last_capture_time = current_time
                self.enrollment_data.append({
                    'timestamp': timestamp,
                    'filename': filename,
                    'quality': quality,
                    'confidence': confidence
                })
                
                # Draw rectangle around face
                cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                cv2.putText(frame, f"Quality: {quality} ({confidence:.2f})", 
                           (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                message = f"AI captured sample {self.samples_collected}/{self.total_samples_needed}"
                return True, message, confidence, quality
            else:
                message = f"Face detected - Adjust position (Quality: {quality})"
                return False, message, confidence, quality
                
        except Exception as e:
            self.logger.error(f"Error in auto-capture: {str(e)}")
            return False, f"Capture error: {str(e)}", 0, "poor"

    def get_enrollment_status(self):
        """Get current enrollment status"""
        return {
            'active': self.enrollment_active,
            'student': self.current_student,
            'samples_collected': self.samples_collected,
            'total_samples_needed': self.total_samples_needed,
            'progress_percent': int((self.samples_collected / self.total_samples_needed) * 100)
        }

    def manual_capture_face(self, frame):
        """Manual face capture backup"""
        if not self.enrollment_active:
            return False, "Enrollment not active", 0, "poor"
        
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(100, 100))
            
            if len(faces) == 0:
                return False, "No face detected for manual capture", 0, "poor"
            
            x, y, w, h = faces[0]
            face_roi = frame[y:y+h, x:x+w]
            
            # Save manual capture
            timestamp = int(time.time())
            filename = f"face_datasets/{self.current_student['student_id']}/manual_{timestamp}.jpg"
            cv2.imwrite(filename, face_roi)
            
            quality, confidence = self.analyze_face_quality(face_roi)
            
            self.samples_collected += 1
            self.enrollment_data.append({
                'timestamp': timestamp,
                'filename': filename,
                'quality': quality,
                'confidence': confidence,
                'manual': True
            })
            
            # Draw rectangle
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
            cv2.putText(frame, f"Manual: {quality}", 
                       (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
            
            message = f"Manual capture {self.samples_collected}/{self.total_samples_needed}"
            return True, message, confidence, quality
            
        except Exception as e:
            self.logger.error(f"Error in manual capture: {str(e)}")
            return False, f"Manual capture failed: {str(e)}", 0, "poor"

# Flask application setup
face_enrollment_ai = FaceEnrollmentAI()

def setup_face_enrollment_routes(app):
    """Setup face enrollment routes for Flask app"""
    
    @app.route('/admin/start_face_enrollment', methods=['POST'])
    def start_face_enrollment():
        try:
            data = request.get_json()
            success, message = face_enrollment_ai.start_enrollment(data)
            return jsonify({'success': success, 'message': message})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    @app.route('/admin/stop_face_enrollment', methods=['POST'])
    def stop_face_enrollment():
        try:
            success, message = face_enrollment_ai.stop_enrollment()
            return jsonify({'success': success, 'message': message})
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    @app.route('/admin/auto_capture_face', methods=['POST'])
    def auto_capture_face():
        try:
            # This would be called from your video feed with the current frame
            # For now, we'll simulate the response
            status = face_enrollment_ai.get_enrollment_status()
            
            # Simulate face detection and capture
            import random
            if status['active'] and status['samples_collected'] < status['total_samples_needed']:
                # Simulate face detection with 80% probability
                if random.random() < 0.8:
                    confidence = random.uniform(0.6, 0.95)
                    quality = 'good' if confidence > 0.7 else 'fair'
                    
                    # Only capture if quality is good and enough time has passed
                    current_time = time.time()
                    if (quality == 'good' and 
                        current_time - face_enrollment_ai.last_capture_time > face_enrollment_ai.capture_interval):
                        
                        face_enrollment_ai.samples_collected += 1
                        face_enrollment_ai.last_capture_time = current_time
                        
                        return jsonify({
                            'success': True,
                            'captured': True,
                            'samples_collected': face_enrollment_ai.samples_collected,
                            'confidence': confidence,
                            'face_quality': quality,
                            'message': f'AI captured quality sample {face_enrollment_ai.samples_collected}/{face_enrollment_ai.total_samples_needed}'
                        })
                    else:
                        return jsonify({
                            'success': True,
                            'captured': False,
                            'face_detected': True,
                            'confidence': confidence,
                            'message': f'Face detected - Quality: {quality}'
                        })
            
            return jsonify({
                'success': True,
                'captured': False,
                'face_detected': False,
                'message': 'Searching for face...'
            })
            
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    @app.route('/admin/capture_face_sample', methods=['POST'])
    def capture_face_sample():
        try:
            status = face_enrollment_ai.get_enrollment_status()
            
            if status['active'] and status['samples_collected'] < status['total_samples_needed']:
                # Simulate manual capture
                import random
                confidence = random.uniform(0.5, 0.9)
                quality = 'good' if confidence > 0.7 else 'fair'
                
                face_enrollment_ai.samples_collected += 1
                
                return jsonify({
                    'success': True,
                    'samples_collected': face_enrollment_ai.samples_collected,
                    'face_quality': quality,
                    'message': f'Manual capture successful! Sample {face_enrollment_ai.samples_collected}/{face_enrollment_ai.total_samples_needed}'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Cannot capture - enrollment not active or completed'
                })
                
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})
    
    @app.route('/admin/get_enrollment_status', methods=['GET'])
    def get_enrollment_status():
        try:
            status = face_enrollment_ai.get_enrollment_status()
            return jsonify(status)
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)})

# Usage in your main Flask app:
# from face_enrollment import setup_face_enrollment_routes
# setup_face_enrollment_routes(app)