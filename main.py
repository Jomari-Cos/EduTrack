from flask import Flask, render_template, request, jsonify, redirect, url_for, Response, session, flash
import cv2
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from flask import jsonify
import numpy as np

import pickle
import threading
import time
import json
from datetime import date
# app.py - Updated with reliable hand detection and modal support
from flask import Flask, render_template, request, jsonify, session, Response
import cv2
import numpy as np
import uuid
import json
from datetime import datetime
import base64
import io
from PIL import Image
import face_system
import threading
from sqlalchemy import func
from Sub_app.models import db, Student, Teacher, Attendance, Score, get_student_analytics, PasswordResetToken
from Sub_app.admin import admin_bp
from Sub_app.update_attendance import attendance_bp

app = Flask(__name__)
app.secret_key = "supersecretkey"

# Database Config
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///smartclassroom.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

# Register Blueprints
app.register_blueprint(admin_bp)
app.register_blueprint(attendance_bp)

# Face Recognition
FACE_DB_PATH = os.path.join('face_database')
os.makedirs(FACE_DB_PATH, exist_ok=True)

# Global variables for face recognition
face_db = {}
recognition_active = False
current_frame = None
frame_lock = threading.Lock()
recognized_students = {}  # Track recently recognized students

# Global variables for AI face enrollment
enrollment_active = False
current_student = None
samples_collected = 0
total_samples_needed = 15
enrollment_data = {
    'embeddings': [],
    'timestamps': [],
    'quality_scores': []
}
enrollment_camera = None
enrollment_camera_initialized = False

# Global camera for face recognition (not initialized at startup)
camera = None
camera_initialized = False

class SimpleFaceDetector:
    """Simple face detector using OpenCV Haar Cascades for enrollment"""
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    
    def detect_faces(self, frame):
        """Detect faces in frame using Haar Cascades"""
        try:
            if frame is None:
                return {'face_detected': False}
                
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            
            if len(faces) > 0:
                # Get the largest face
                faces = sorted(faces, key=lambda x: x[2] * x[3], reverse=True)
                x, y, w, h = faces[0]
                
                # Simple quality checks
                quality = self._check_face_quality(frame, x, y, w, h)
                
                return {
                    'face_detected': True,
                    'face_data': {
                        'region': {'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h)},
                        'confidence': 0.8,
                        'quality': quality['overall'],
                        'quality_breakdown': quality
                    }
                }
            else:
                return {'face_detected': False}
                
        except Exception as e:
            print(f"Error in face detection: {str(e)}")
            return {'face_detected': False}
    
    def _check_face_quality(self, frame, x, y, w, h):
        """Check face quality based on simple metrics"""
        quality = {
            'overall': 'poor',
            'brightness': 0,
            'sharpness': 0,
            'alignment': 0,
            'size': 0
        }
        
        try:
            # Extract face region
            face_roi = frame[y:y+h, x:x+w]
            
            if face_roi.size > 0:
                # Brightness check
                gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
                brightness = np.mean(gray_face)
                quality['brightness'] = min(abs(brightness - 127) / 127, 1.0)
                
                # Sharpness check
                sharpness = cv2.Laplacian(gray_face, cv2.CV_64F).var()
                quality['sharpness'] = min(sharpness / 1000, 1.0)
                
                # Size check
                frame_area = frame.shape[0] * frame.shape[1]
                face_area = w * h
                size_ratio = face_area / frame_area
                quality['size'] = min(size_ratio / 0.3, 1.0)
                
                # Alignment check (simple center-based)
                frame_center_x = frame.shape[1] // 2
                face_center_x = x + w // 2
                alignment_x = 1 - min(abs(face_center_x - frame_center_x) / frame_center_x, 1.0)
                
                frame_center_y = frame.shape[0] // 2
                face_center_y = y + h // 2
                alignment_y = 1 - min(abs(face_center_y - frame_center_y) / frame_center_y, 1.0)
                
                quality['alignment'] = (alignment_x + alignment_y) / 2
                
                # Overall quality
                weights = {'brightness': 0.2, 'sharpness': 0.3, 'size': 0.2, 'alignment': 0.3}
                overall_score = (
                    quality['brightness'] * weights['brightness'] +
                    quality['sharpness'] * weights['sharpness'] +
                    quality['size'] * weights['size'] +
                    quality['alignment'] * weights['alignment']
                )
                
                if overall_score > 0.7:
                    quality['overall'] = 'good'
                elif overall_score > 0.4:
                    quality['overall'] = 'fair'
                else:
                    quality['overall'] = 'poor'
            
            return quality
            
        except Exception as e:
            print(f"Error in quality check: {str(e)}")
            return quality

# Initialize face detector for enrollment
face_detector = SimpleFaceDetector()

def init_enrollment_camera():
    """Initialize camera for enrollment"""
    global enrollment_camera, enrollment_camera_initialized
    
    try:
        # Release existing camera if any
        if enrollment_camera is not None:
            enrollment_camera.release()
            enrollment_camera = None
        
        # Try different camera indices
        for camera_index in [0, 1, 2]:
            try:
                print(f"🔍 Trying to initialize enrollment camera at index {camera_index}...")
                enrollment_camera = cv2.VideoCapture(camera_index)
                
                # Set camera properties
                enrollment_camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                enrollment_camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                enrollment_camera.set(cv2.CAP_PROP_FPS, 30)
                
                # Test if camera works by reading a frame
                success, test_frame = enrollment_camera.read()
                if success and test_frame is not None:
                    print(f"✅ Enrollment camera initialized successfully at index {camera_index}")
                    enrollment_camera_initialized = True
                    return True
                else:
                    enrollment_camera.release()
                    enrollment_camera = None
                    
            except Exception as e:
                print(f"❌ Failed to initialize camera at index {camera_index}: {e}")
                if enrollment_camera:
                    enrollment_camera.release()
                    enrollment_camera = None
        
        print("❌ Could not initialize any enrollment camera")
        enrollment_camera_initialized = False
        return False
        
    except Exception as e:
        print(f"❌ Error initializing enrollment camera: {str(e)}")
        enrollment_camera_initialized = False
        return False


# ============================================================================
# ADD TEACHER ROUTE - FIXED VERSION
# ============================================================================

@app.route('/add-teacher', methods=['POST'])
def add_teacher():
    """Add teacher route - fixed version in main app"""
    try:
        # Get form data
        teacher_name = request.form.get('teacher_name')
        teacher_id = request.form.get('teacher_id')
        teacher_email = request.form.get('teacher_email')
        teacher_password = request.form.get('teacher_password')
        assigned_classes_json = request.form.get('assigned_classes', '[]')
        rfid_code = request.form.get('rfid_code')
        
        print(f"📝 Adding teacher: {teacher_name}, ID: {teacher_id}, Email: {teacher_email}")
        
        # Check if teacher already exists
        existing_teacher = Teacher.query.filter_by(teacher_id=teacher_id).first()
        if existing_teacher:
            flash('Teacher with this ID already exists!', 'error')
            return redirect(url_for('admin.admin_dashboard'))
        
        # Parse assigned classes
        try:
            assigned_classes = json.loads(assigned_classes_json)
        except:
            assigned_classes = []
        
        # Handle file upload
        teacher_photo = request.files.get('teacher_photo')
        photo_filename = None
        
        if teacher_photo and teacher_photo.filename:
            # Create uploads directory if it doesn't exist
            uploads_dir = os.path.join('static', 'uploads')
            os.makedirs(uploads_dir, exist_ok=True)
            
            # Secure filename and save
            filename = secure_filename(teacher_photo.filename)
            photo_filename = f"teacher_{teacher_id}_{filename}"
            photo_path = os.path.join(uploads_dir, photo_filename)
            teacher_photo.save(photo_path)
            print(f"💾 Saved teacher photo: {photo_filename}")
        
        # Create new teacher
        new_teacher = Teacher(
            teacher_id=teacher_id,
            name=teacher_name,
            email=teacher_email,
            assigned_classes=json.dumps(assigned_classes),
            rfid_code=rfid_code,
            image=photo_filename
        )
        
        # Set password
        new_teacher.set_password(teacher_password)
        
        # Add to database
        db.session.add(new_teacher)
        db.session.commit()
        
        print(f"✅ Teacher added successfully: {teacher_name}")
        flash(f'Teacher {teacher_name} added successfully!', 'success')
        return redirect(url_for('admin.admin_dashboard'))
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error adding teacher: {str(e)}")
        flash(f'Error adding teacher: {str(e)}', 'error')
        return redirect(url_for('admin.admin_dashboard'))


# ============================================================================
# ORIGINAL ROUTES (KEEP ALL YOUR EXISTING FUNCTIONALITY)
# ============================================================================

@app.route("/")
def index():
    return render_template("mainH.html")

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    teacher = Teacher.query.filter_by(teacher_id=username).first()
    if teacher and teacher.check_password(password):
        session["role"] = "teacher"
        session["teacher_id"] = teacher.teacher_id
        session["teacher_name"] = teacher.name
        session["teacher_email"] = teacher.email
        session["teacher_photo"] = teacher.photo  # ✅ Store teacher photo path
        
        return jsonify({"success": True, "redirect": url_for("dashboard")})

    elif username == "admin1" and password == "123":
        session["role"] = "admin"
        return jsonify({"success": True, "redirect": url_for("admin.admin_dashboard")})
    
    else:
        return jsonify({"success": False, "message": "Invalid username or password!"})

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("index"))


# ============================================================================
# PASSWORD RESET ROUTES
# ============================================================================

@app.route("/request-password-reset", methods=["POST"])
def request_password_reset():
    """Request password reset via email"""
    try:
        from Sub_app.models import PasswordResetToken
        from email_config import send_password_reset_email
        
        data = request.get_json()
        identifier = data.get("identifier", "").strip()  # Can be teacher_id or email
        
        if not identifier:
            return jsonify({
                "success": False, 
                "message": "Please provide your Teacher ID or email"
            })
        
        # Find teacher by ID or email
        teacher = Teacher.query.filter(
            (Teacher.teacher_id == identifier) | (Teacher.email == identifier)
        ).first()
        
        if not teacher:
            # Don't reveal if teacher exists (security)
            return jsonify({
                "success": True, 
                "message": "If this account exists, a password reset link has been sent to the registered email."
            })
        
        # Check if teacher has an email
        if not teacher.email:
            return jsonify({
                "success": False,
                "message": "No email address associated with this account. Please contact administrator."
            })
        
        # Invalidate any existing tokens for this teacher
        existing_tokens = PasswordResetToken.query.filter_by(
            teacher_id=teacher.teacher_id,
            used=False
        ).all()
        for token in existing_tokens:
            token.mark_as_used()
        
        # Create new reset token
        reset_token = PasswordResetToken(teacher.teacher_id, expiry_minutes=60)
        db.session.add(reset_token)
        db.session.commit()
        
        # Build reset link
        reset_link = url_for('reset_password_page', 
                           token=reset_token.token, 
                           _external=True)
        
        # Send email
        success, message = send_password_reset_email(
            recipient_email=teacher.email,
            teacher_name=teacher.name,
            reset_link=reset_link,
            teacher_id=teacher.teacher_id
        )
        
        if success:
            return jsonify({
                "success": True,
                "message": "Password reset link has been sent to your email address."
            })
        else:
            # Log the error but don't expose details to user
            print(f"❌ Email sending failed: {message}")
            return jsonify({
                "success": False,
                "message": "Failed to send email. Please contact administrator."
            })
            
    except Exception as e:
        print(f"❌ Password reset request error: {str(e)}")
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "An error occurred. Please try again later."
        })


@app.route("/reset-password-rfid", methods=["POST"])
def reset_password_rfid():
    """Reset password using RFID verification"""
    try:
        from email_config import send_password_change_notification
        
        data = request.get_json()
        rfid_code = data.get("rfid_code", "").strip()
        new_password = data.get("new_password", "").strip()
        confirm_password = data.get("confirm_password", "").strip()
        
        # Validation
        if not rfid_code:
            return jsonify({"success": False, "message": "Please scan your RFID card"})
        
        if not new_password or len(new_password) < 6:
            return jsonify({
                "success": False, 
                "message": "Password must be at least 6 characters long"
            })
        
        if new_password != confirm_password:
            return jsonify({
                "success": False, 
                "message": "Passwords do not match"
            })
        
        # Find teacher by RFID
        teacher = Teacher.query.filter_by(rfid_code=rfid_code).first()
        
        if not teacher:
            return jsonify({
                "success": False, 
                "message": "Invalid RFID card or no account associated"
            })
        
        # Update password
        teacher.set_password(new_password)
        db.session.commit()
        
        # Send notification email (optional, don't fail if it doesn't work)
        if teacher.email:
            send_password_change_notification(
                teacher.email, 
                teacher.name, 
                teacher.teacher_id
            )
        
        return jsonify({
            "success": True,
            "message": "Password reset successful! You can now log in with your new password."
        })
        
    except Exception as e:
        print(f"❌ RFID password reset error: {str(e)}")
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "An error occurred. Please try again."
        })


@app.route("/reset-password/<token>", methods=["GET"])
def reset_password_page(token):
    """Display password reset page"""
    try:
        from Sub_app.models import PasswordResetToken
        
        # Verify token
        reset_token = PasswordResetToken.query.filter_by(token=token).first()
        
        if not reset_token or not reset_token.is_valid():
            flash("This password reset link is invalid or has expired.", "error")
            return redirect(url_for("index"))
        
        # Render password reset form
        return render_template("reset_password.html", token=token)
        
    except Exception as e:
        print(f"❌ Reset password page error: {str(e)}")
        flash("An error occurred. Please try again.", "error")
        return redirect(url_for("index"))


@app.route("/reset-password", methods=["POST"])
def reset_password():
    """Process password reset"""
    try:
        from Sub_app.models import PasswordResetToken
        from email_config import send_password_change_notification
        
        data = request.get_json()
        token = data.get("token", "").strip()
        new_password = data.get("new_password", "").strip()
        confirm_password = data.get("confirm_password", "").strip()
        
        # Validation
        if not new_password or len(new_password) < 6:
            return jsonify({
                "success": False,
                "message": "Password must be at least 6 characters long"
            })
        
        if new_password != confirm_password:
            return jsonify({
                "success": False,
                "message": "Passwords do not match"
            })
        
        # Verify token
        reset_token = PasswordResetToken.query.filter_by(token=token).first()
        
        if not reset_token or not reset_token.is_valid():
            return jsonify({
                "success": False,
                "message": "This reset link is invalid or has expired"
            })
        
        # Get teacher
        teacher = Teacher.query.filter_by(teacher_id=reset_token.teacher_id).first()
        
        if not teacher:
            return jsonify({
                "success": False,
                "message": "Teacher account not found"
            })
        
        # Update password
        teacher.set_password(new_password)
        
        # Mark token as used
        reset_token.mark_as_used()
        
        db.session.commit()
        
        # Send notification email
        if teacher.email:
            send_password_change_notification(
                teacher.email,
                teacher.name,
                teacher.teacher_id
            )
        
        return jsonify({
            "success": True,
            "message": "Password reset successful! You can now log in with your new password."
        })
        
    except Exception as e:
        print(f"❌ Password reset error: {str(e)}")
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "An error occurred. Please try again."
        })



@app.route("/dashboard")
def dashboard():
    # Only allow teachers
    if session.get("role") != "teacher":
        return redirect(url_for("index"))

    # Get current teacher
    current_teacher_id = session.get("teacher_id")
    teacher = Teacher.query.filter_by(teacher_id=current_teacher_id).first()

    # Analytics data (optional)
    raw_student = get_student_analytics()

    # Get all students
    students = Student.query.all()
    today = datetime.now().date()

    # Attach today's attendance status to each student
    for s in students:
        attendance_record = Attendance.query.filter_by(student_id=s.id, date=today).first()
        # Add a property `status` to each student object
        s.status = attendance_record.status if attendance_record else "Absent"
        # Optional: also add a boolean for easier JS handling
        s.is_present = True if s.status == "Present" else False

    # Pass students and other info to template
    return render_template(
        "dashboard.html",
        students=students,
        teacher=teacher,
        raw_student=raw_student,
        today=today
    )



@app.route("/stop-face-recognition", methods=["POST"])
def stop_face_recognition():
    global recognition_active, camera, camera_initialized
    recognition_active = False
    
    # Release camera when face recognition stops
    if camera:
        camera.release()
        camera = None
        camera_initialized = False
    
    return jsonify({"success": True, "message": "Face recognition stopped"})


def mark_attendance(student_id, student_name):
    """Mark attendance for recognized student"""
    try:
        today = datetime.now().date()
        
        # Check if attendance already marked today
        existing_attendance = Attendance.query.filter_by(
            student_id=student_id, 
            date=today
        ).first()
        
        if not existing_attendance:
            # Create new attendance record
            new_attendance = Attendance(
                student_id=student_id,
                date=today,
                status="Present",
                time_in=datetime.now().time()
            )
            db.session.add(new_attendance)
            db.session.commit()
            print(f"✅ Attendance marked for {student_name}")
        
    except Exception as e:
        print(f"❌ Error marking attendance for {student_name}: {e}")
        

@app.route("/set-current-class", methods=["POST"])
def set_current_class():
    data = request.get_json()
    session["current_grade"] = data.get("grade", "")
    session["current_section"] = data.get("section", "")
    session["current_subject"] = data.get("subject", "")
    session["current_class_index"] = data.get("index", 1)  # default to 1 if not provided
    return jsonify({"success": True})

@app.route("/get-current-class")
def get_current_class():
    return jsonify({
        "grade": session.get("current_grade", ""),
        "section": session.get("current_section", ""),
        "subject": session.get("current_subject", ""),
        "index": session.get("current_class_index", 1)
    })

@app.route("/face_recognize")
def face_recognize():
    return render_template("face_recognize.html")




@app.route("/get-recognized-students")
def get_recognized_students():
    """Get list of recently recognized students"""
    global recognized_students
    
    students_list = []
    for student_id, data in recognized_students.items():
        students_list.append({
            'student_id': student_id,
            'name': data['name'],
            'confidence': round(data['confidence'], 2),
            'last_seen': datetime.fromtimestamp(data['last_seen']).strftime('%H:%M:%S')
        })
    
    return jsonify(students_list)


@app.route("/quick-stats")
def get_quick_stats():
    try:
        today = date.today()

        grade = request.args.get("grade")
        section = request.args.get("section")
        subject = request.args.get("subject")

        students_query = db.session.query(Student)

        if grade:
            students_query = students_query.filter(Student.grade_level == grade)
        if section:
            students_query = students_query.filter(Student.section == section)

        students_in_class = students_query.all()
        student_ids = [s.id for s in students_in_class]

        if not student_ids:
            return jsonify({
                "active_students": 0,
                "active_students_change": 0,
                "average_engagement": 0,
                "average_engagement_change": 0,
                "needs_assistance": 0,
                "needs_assistance_change": 0,
                "present": 0,
                "total": 0,
                "attendance_percent": 0
            })

        total_students = len(student_ids)

        active_students = (
            db.session.query(func.count(Attendance.id))
            .filter(
                Attendance.student_id.in_(student_ids),
                Attendance.status == "Present",
                func.date(Attendance.date) == today
            )
            .scalar()
            or 0
        )
        active_students_change = 5

        avg_engagement_query = db.session.query(func.avg(Score.points)).filter(
            Score.student_id.in_(student_ids)
        )

        if subject:
            avg_engagement_query = avg_engagement_query.filter(Score.subject == subject)

        avg_engagement = avg_engagement_query.scalar() or 0
        avg_engagement = round(avg_engagement, 2)
        avg_engagement_change = -2

        low_performers = (
            db.session.query(Student.student_id)
            .join(Score, Score.student_id == Student.student_id)
            .filter(Student.id.in_(student_ids))
            .group_by(Student.student_id)
            .having(func.avg(Score.points) < 70)
            .count()
        )
        needs_assistance_change = 1

        total_attendance_today = (
            db.session.query(func.count(Attendance.id))
            .filter(
                Attendance.student_id.in_(student_ids),
                func.date(Attendance.date) == today
            )
            .scalar()
            or 0
        )

        present_today = (
            db.session.query(func.count(Attendance.id))
            .filter(
                Attendance.student_id.in_(student_ids),
                Attendance.status == "Present",
                func.date(Attendance.date) == today
            )
            .scalar()
            or 0
        )

        attendance_percent = (
            round((present_today / total_students) * 100, 2)
            if total_students > 0 else 0
        )

        quick_stats = {
            "active_students": active_students,
            "active_students_change": active_students_change,
            "average_engagement": avg_engagement,
            "average_engagement_change": avg_engagement_change,
            "needs_assistance": low_performers,
            "needs_assistance_change": needs_assistance_change,
            "present": present_today,
            "total": total_students,
            "attendance_percent": attendance_percent,
        }

        return jsonify(quick_stats)

    except Exception as e:
        print("❌ Error generating quick stats:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/top-students-data")
def top_students_data():
    try:
        # Get optional filters from request
        grade = request.args.get('grade', '')
        section = request.args.get('section', '')
        subject = request.args.get('subject', '')
        
        # Fetch analytics with filters
        analytics = get_student_analytics(grade=grade, section=section, subject=subject)
        if not analytics:
            return jsonify([])

        # Calculate performance score (70% academic + 30% attendance)
        for s in analytics:
            score = s.get("average_score") or 0
            attendance = s.get("attendance") or 0
            
            # If we have both scores and attendance, use weighted average
            if score > 0 and attendance > 0:
                s["performance"] = round((score * 0.7) + (attendance * 0.3), 2)
            # If only scores are available
            elif score > 0:
                s["performance"] = score
            # If only attendance is available
            elif attendance > 0:
                s["performance"] = attendance
            else:
                s["performance"] = 0

        # Get top 3 students
        top_students = sorted(
            analytics, key=lambda x: x.get("performance", 0), reverse=True
        )[:3]

        response = []
        for idx, s in enumerate(top_students, start=1):
            first = s.get("first_name", "")
            middle = s.get("middle_initial", "")
            last = s.get("last_name", "")
            name = f"{first} {middle + '. ' if middle else ''}{last}".strip()

            photo_path = s.get("image", "")

            if photo_path:
                if not (photo_path.startswith("/static/") or photo_path.startswith("http")):
                    photo_path = f"/static/uploads/{photo_path}"
            else:
                photo_path = ""

            response.append({
                "rank": idx,
                "name": name,
                "attendance": round(s.get("attendance", 0), 2),
                "average_score": round(s.get("average_score", 0), 2),
                "performance": s["performance"],
                "photo": photo_path,
                "grade": s.get("grade_level", ""),
                "section": s.get("section", ""),
                "subject": subject if subject else "Overall",
                "subject_scores": s.get("subject_scores", {})
            })

        return jsonify(response)

    except Exception as e:
        print("❌ Error generating top students:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/login-rfid", methods=["POST"])
def login_rfid():
    data = request.get_json()
    rfid_code = data.get("rfid_code")

    teacher = Teacher.query.filter_by(rfid_code=rfid_code).first()

    if teacher:
        session["teacher_id"] = teacher.teacher_id
        session["teacher_name"] = teacher.name
        session["role"] = "teacher"
        session["teacher_email"] = teacher.email
        return jsonify({"success": True, "redirect": "/dashboard"})
    
    return jsonify({"success": False, "message": "Invalid RFID card"})

@app.route("/save-points", methods=["POST"])
def save_points():
    try:
        data = request.get_json()

        raw_date = data.get("date")
        if raw_date.endswith("Z"):
            raw_date = raw_date.replace("Z", "+00:00")
        parsed_date = datetime.fromisoformat(raw_date)

        score = Score(
            student_id=data["student_id"],
            subject=data["subject"],
            points=int(data["points"]),
            date=parsed_date
        )

        db.session.add(score)
        db.session.commit()

        return jsonify({"success": True, "message": "Points saved!"})

    except Exception as e:
        print("❌ Error in /save-points:", str(e))
        return jsonify({"success": False, "message": str(e)}), 400

from sqlalchemy import case
from sqlalchemy.exc import SQLAlchemyError

@app.route("/chart-data")
def get_chart_data():
    section = request.args.get("section", "").strip()
    filter_by_section = section and section.lower() != "all"

    def safe_filter(query, model):
        return query.filter(Student.section == section) if filter_by_section else query

    try:
        attendance_query = (
            db.session.query(
                Student.id,
                Student.first_name,
                Student.middle_initial,
                Student.last_name,
                func.count(
                    case((Attendance.status == "Present", 1))
                ).label("present_count"),
            )
            .outerjoin(Attendance, Attendance.student_id == Student.id)
        )
        attendance_query = safe_filter(attendance_query, Student)
        attendance_data = attendance_query.group_by(Student.id).all()

        attendance_labels = [
            f"{s.first_name} {s.middle_initial + '. ' if s.middle_initial else ''}{s.last_name}"
            for s in attendance_data
        ]
        attendance_values = [s.present_count or 0 for s in attendance_data]

        scores_query = (
            db.session.query(
                Score.subject,
                func.avg(Score.points).label("avg_score"),
            )
            .join(Student, Student.student_id == Score.student_id)
        )
        scores_query = safe_filter(scores_query, Student)
        scores_data = scores_query.group_by(Score.subject).all()

        score_labels = [s.subject for s in scores_data]
        score_values = [round(s.avg_score or 0, 2) for s in scores_data]

        average_query = (
            db.session.query(
                Student.grade_level,
                Student.section,
                func.avg(Score.points).label("avg_score"),
            )
            .join(Score, Score.student_id == Student.student_id)
        )
        average_query = safe_filter(average_query, Student)
        average_data = average_query.group_by(Student.grade_level, Student.section).all()

        average_labels = [f"{a.grade_level}-{a.section}" for a in average_data]
        average_values = [round(a.avg_score or 0, 2) for a in average_data]

        metric_query = (
            db.session.query(
                func.strftime("%W", Score.date).label("week_number"),
                func.sum(Score.points).label("total_points"),
            )
            .join(Student, Student.student_id == Score.student_id)
        )
        metric_query = safe_filter(metric_query, Student)
        metric_data = metric_query.group_by("week_number").order_by("week_number").all()

        metric_labels = [f"Week {int(m.week_number) + 1}" for m in metric_data]
        metric_values = [m.total_points or 0 for m in metric_data]

        correlation_query = (
            db.session.query(
                Student.id,
                Student.first_name,
                Student.middle_initial,
                Student.last_name,
                func.avg(Score.points).label("avg_score"),
                func.count(
                    case((Attendance.status == "Present", 1))
                ).label("attendance_count"),
            )
            .outerjoin(Score, Score.student_id == Student.student_id)
            .outerjoin(Attendance, Attendance.student_id == Student.id)
        )
        correlation_query = safe_filter(correlation_query, Student)
        correlation_data = correlation_query.group_by(Student.id).all()

        correlation_labels = [
            f"{s.first_name} {s.middle_initial + '. ' if s.middle_initial else ''}{s.last_name}"
            for s in correlation_data
        ]
        correlation_values = [
            round(((s.avg_score or 0) * 0.7) + ((s.attendance_count or 0) * 0.3), 2)
            for s in correlation_data
        ]

        attendance_trend_query = (
            db.session.query(
                func.strftime("%W", Attendance.date).label("week_number"),
                func.count(
                    case((Attendance.status == "Present", 1))
                ).label("present_count"),
            )
            .join(Student, Student.id == Attendance.student_id)
        )
        attendance_trend_query = safe_filter(attendance_trend_query, Student)
        attendance_trend_data = attendance_trend_query.group_by("week_number").order_by("week_number").all()

        attendance_trend_labels = [f"Week {int(a.week_number) + 1}" for a in attendance_trend_data]
        attendance_trend_values = [a.present_count or 0 for a in attendance_trend_data]

        total_students_query = db.session.query(func.count(Student.id))
        total_present_query = db.session.query(func.count(Attendance.id)).filter(Attendance.status == "Present")

        if filter_by_section:
            total_students_query = total_students_query.filter(Student.section == section)
            total_present_query = total_present_query.join(Student).filter(Student.section == section)

        total_students = total_students_query.scalar() or 0
        total_present = total_present_query.scalar() or 0

        chart_data = {
            "attendance": {"labels": attendance_labels, "values": attendance_values},
            "scores": {"labels": score_labels, "values": score_values},
            "average": {"labels": average_labels, "values": average_values},
            "metric": {"labels": metric_labels, "values": metric_values},
            "correlation": {"labels": correlation_labels, "values": correlation_values},
            "attendance_trend": {"labels": attendance_trend_labels, "values": attendance_trend_values},
            "summary": {"total_students": total_students, "total_present": total_present},
        }

        return jsonify(chart_data)

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500

    except Exception as e:
        return jsonify({"error": "Unexpected error", "details": str(e)}), 500
    

# app_insights.py
from flask import request, jsonify
import openai, os

@app.route("/generate_student_insight", methods=["POST"])
def generate_student_insight():
    data = request.get_json()

    name = data.get("name", "Student")
    attendance = data.get("attendance", "N/A")
    subjects = data.get("subjects", {})

   
    prompt = f"""
    You are an expert educational data analyst. Analyze the following student performance data and generate a concise, data-driven report.

    STUDENT DATA:
    - Name: {name}
    - Attendance Rate: {attendance}%
    - Subject Scores: {subjects}

    TASK:
    Produce a structured analytics summary with the following sections:

    1. **Overall Performance**
    - Summarize the student’s attendance percentage and overall score trend (e.g., consistent, strong, or below average).
    - Identify the strongest and weakest subjects numerically.

    2. **Subject Analysis**
    - List each subject with its score and classify performance as:
        (Excellent: 90–100, Good: 80–89, Fair: 70–79, Needs Improvement: <70).

    3. **Performance Indicators**
    - Calculate and present key metrics:
        • Average score across all subjects  
        • Highest and lowest subject scores  
        • Attendance classification:  
        - Excellent ≥ 90%  
        - Good 80–89%  
        - Fair 70–79%  
        - Poor < 70%

    4. **Analytical Summary**
    - Provide one sentence describing the overall academic standing based solely on numerical trends and comparisons.

    RULES:
    - Focus strictly on quantitative and analytical insights.
    - Avoid any personal traits, emotions, or behavioral comments.
    - Use clear, professional, and concise language.
    - Format output in markdown for readability.
    """
    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.7,
        )

        feedback = response.choices[0].message.content.strip()
        return jsonify({"insight": feedback})

    except Exception as e:
        print("❌ Insight generation failed:", e)
        return jsonify({"insight": "⚠ Unable to generate feedback right now."}), 500

@app.route("/get-student/<student_id>")
def get_student(student_id):
    student = Student.query.filter_by(student_id=student_id).first()
    today = datetime.now().date()
    
    if student:
        # Check today's attendance
        attendance = Attendance.query.filter_by(student_id=student.id, date=today).first()
        is_present = attendance.status == "Present" if attendance else False

        return jsonify({
            "success": True,
            "student_name": f"{student.first_name} {student.last_name}",
            "is_present": is_present  # <-- new field
        })
    
    return jsonify({"success": False})

# Initialize face system
face_system = face_system.FaceRecognitionSystem()

# Lock for thread safety
system_lock = threading.Lock()

# Predefined sections
DEFAULT_SECTIONS = []  # Your hardcoded defaults

def get_all_sections_with_defaults():
    """Get all sections including defaults, efficiently"""
    # Start with default sections
    all_sections = set(DEFAULT_SECTIONS)
    
    # Query only the assigned_classes column (more efficient)
    teachers = Teacher.query.with_entities(Teacher.assigned_classes).all()
    
    for teacher_data in teachers:
        if teacher_data.assigned_classes:
            try:
                classes = json.loads(teacher_data.assigned_classes)
                for class_info in classes:
                    section = class_info.get('section')
                    if section:
                        all_sections.add(section)
            except (json.JSONDecodeError, TypeError):
                continue
    
    return sorted(list(all_sections))


@app.route('/register')
def register_page():
    return render_template('face_register.html')

@app.route('/recognize')
def recognize_page():
    return render_template('recognize.html')

@app.route('/api/sections', methods=['GET'])
def get_sections():
    """Get all available sections."""
    with system_lock:
        sections = face_system.get_all_sections()
    
    # Add default sections that might not have any persons yet
    existing_section_names = [s['name'] for s in sections]
    all_sections = sections.copy()
    
    for section_name in DEFAULT_SECTIONS:
        if section_name not in existing_section_names:
            all_sections.append({
                'name': section_name,
                'person_count': 0,
                'total_samples': 0
            })
    
    return jsonify({'sections': all_sections})

@app.route('/api/create_section', methods=['POST'])
def create_section():
    """Create a new section."""
    data = request.json
    section_name = data.get('name', '').strip()
    
    if not section_name:
        return jsonify({'success': False, 'message': 'Section name is required'})
    
    with system_lock:
        result = face_system.create_section(section_name)
    
    return jsonify(result)

@app.route('/api/start_registration', methods=['POST'])
def start_registration():
    data = request.json
    person_name = data.get('name', '').strip()
    id_number = data.get('id_number', '').strip()
    section_name = data.get('section', '').strip()
    samples_per_angle = data.get('samples_per_angle', 5)
    
    if not person_name:
        return jsonify({'success': False, 'message': 'Name is required'})
    
    if not id_number:
        return jsonify({'success': False, 'message': 'ID number is required'})
    
    if not section_name:
        return jsonify({'success': False, 'message': 'Section is required'})
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    
    with system_lock:
        result = face_system.start_registration(session_id, person_name, id_number, section_name, samples_per_angle)
    
    if result['success']:
        session['registration_session'] = session_id
        session['person_name'] = result['person_name']
        session['id_number'] = result['id_number']
        session['section_name'] = result['section_name']
    
    return jsonify(result)

@app.route('/api/check_id', methods=['POST'])
def check_id_availability():
    """Check if an ID number is available."""
    data = request.json
    id_number = data.get('id_number', '').strip()
    
    if not id_number:
        return jsonify({'available': False, 'message': 'ID number is required'})
    
    with system_lock:
        result = face_system.check_id_availability(id_number)
    
    return jsonify(result)

@app.route('/api/process_registration_frame', methods=['POST'])
def process_registration_frame():
    if 'registration_session' not in session:
        return jsonify({'success': False, 'message': 'No active registration session'})
    
    session_id = session['registration_session']
    
    # Get image from request
    if 'image' not in request.json:
        return jsonify({'success': False, 'message': 'No image provided'})
    
    # Decode base64 image
    image_data = request.json['image'].split(',')[1]
    nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        return jsonify({'success': False, 'message': 'Failed to decode image'})
    
    with system_lock:
        result = face_system.process_registration_frame(session_id, frame)
    
    return jsonify(result)

@app.route('/api/next_registration_angle', methods=['POST'])
def next_registration_angle():
    if 'registration_session' not in session:
        return jsonify({'success': False, 'message': 'No active registration session'})
    
    session_id = session['registration_session']
    
    with system_lock:
        result = face_system.next_registration_angle(session_id)
    
    return jsonify(result)

@app.route('/api/finish_registration', methods=['POST'])
def finish_registration():
    if 'registration_session' not in session:
        return jsonify({'success': False, 'message': 'No active registration session'})
    
    session_id = session['registration_session']
    
    with system_lock:
        result = face_system.finish_registration(session_id)
    
    if result['success']:
        # Clear session
        session.pop('registration_session', None)
        session.pop('person_name', None)
        session.pop('id_number', None)
        session.pop('section_name', None)
    
    return jsonify(result)

@app.route('/api/cancel_registration', methods=['POST'])
def cancel_registration():
    if 'registration_session' not in session:
        return jsonify({'success': False, 'message': 'No active registration session'})
    
    session_id = session['registration_session']
    
    with system_lock:
        result = face_system.cancel_registration(session_id)
    
    # Clear session
    session.pop('registration_session', None)
    session.pop('person_name', None)
    session.pop('id_number', None)
    session.pop('section_name', None)
    
    return jsonify(result)

@app.route('/api/recognize_face', methods=['POST'])
def recognize_face():
    # Get image from request
    if 'image' not in request.json:
        return jsonify({'success': False, 'message': 'No image provided'})
    
    # Get section from request
    section_name = request.json.get('section', None)
    
    # Get hand detection setting from request (default to True)
    enable_hand_detection = request.json.get('enable_hand_detection', True)
    
    # Get session ID or generate one
    session_id = request.json.get('session_id')
    if not session_id:
        # Generate a session ID for tracking
        session_id = str(uuid.uuid4())
    
    # Decode base64 image
    image_data = request.json['image'].split(',')[1]
    nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        return jsonify({'success': False, 'message': 'Failed to decode image'})
    
    with system_lock:
        results, optimization_stats = face_system.recognize_faces_with_tracking(frame, section_name, session_id)
        
        # Get hand landmarks if hand detection is enabled
        hand_landmarks = []
        if enable_hand_detection and face_system.hand_detection_enabled:
            print("Detecting hands for recognition request...")
            hand_landmarks = face_system.hand_detector.detect_hands(frame)
            print(f"Detected {len(hand_landmarks)} hand(s)")
    
    return jsonify({
        'success': True,
        'faces': results,
        'optimization_stats': optimization_stats,
        'hand_landmarks': hand_landmarks,  # Add hand landmarks to response
        'session_id': session_id,
        'timestamp': datetime.now().isoformat(),
        'debug_info': {
            'hand_detection_enabled': face_system.hand_detection_enabled,
            'hands_detected': len(hand_landmarks),
            'faces_detected': len(results)
        }
    })

@app.route('/api/clear_tracking', methods=['POST'])
def clear_tracking():
    """Clear tracking for a session."""
    data = request.json
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({'success': False, 'message': 'Session ID is required'})
    
    with system_lock:
        result = face_system.clear_session_tracking(session_id)
    
    return jsonify(result)

@app.route('/api/database_stats', methods=['GET'])
def get_database_stats():
    with system_lock:
        stats = face_system.get_database_stats()
    
    return jsonify(stats)

@app.route('/api/section_persons', methods=['GET'])
def get_section_persons():
    section_name = request.args.get('section')
    if not section_name:
        return jsonify({'success': False, 'message': 'Section name is required'})
    
    with system_lock:
        persons = face_system.get_section_persons(section_name)
    
    return jsonify({
        'success': True,
        'section': section_name,
        'persons': persons,
        'count': len(persons)
    })

@app.route('/api/delete_section', methods=['POST'])
def delete_section():
    data = request.json
    section_name = data.get('name', '').strip()
    
    if not section_name:
        return jsonify({'success': False, 'message': 'Section name is required'})
    
    with system_lock:
        result = face_system.delete_section(section_name)
    
    return jsonify(result)

@app.route('/api/check_session', methods=['GET'])
def check_session():
    if 'registration_session' in session:
        return jsonify({
            'active': True,
            'person_name': session.get('person_name', 'Unknown'),
            'id_number': session.get('id_number', 'N/A'),
            'section_name': session.get('section_name', 'Unknown')
        })
    return jsonify({'active': False})

@app.route('/api/close_modal', methods=['POST'])
def close_modal():
    """Close an active modal."""
    data = request.json
    session_id = data.get('session_id')
    track_id = data.get('track_id')
    
    if not session_id or not track_id:
        return jsonify({'success': False, 'message': 'Session ID and Track ID are required'})
    
    with system_lock:
        result = face_system.close_modal(session_id, track_id)
    
    return jsonify(result)


# ===================================================================
# ADD THESE ROUTES TO YOUR FLASK APP
# ===================================================================

@app.route('/api/mark_attendance', methods=['POST'])
def mark_attendance():
    try:
        data = request.json
        
        student_id = data.get('student_id')
        student_name = data.get('student_name')
        section = data.get('section')
        date_str = data.get('date')
        status = data.get('status', 'present')
        
        if not student_id or student_id == 'N/A':
            return jsonify({'success': False, 'message': 'Student ID required'})
        
        # Parse date
        try:
            attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except:
            attendance_date = date.today()
        
        # Check if student exists
        student = Student.query.filter_by(student_id=student_id).first()
        
        # If not found by ID, try by name and section
        if not student and student_name and section:
            # Try to find by name (first name and last name)
            names = student_name.split(' ')
            if len(names) >= 2:
                first_name = names[0]
                last_name = names[-1]
                
                student = Student.query.filter(
                    and_(
                        Student.first_name.ilike(f'%{first_name}%'),
                        Student.last_name.ilike(f'%{last_name}%'),
                        Student.section == section
                    )
                ).first()
        
        if not student:
            return jsonify({
                'success': False, 
                'message': f'Student {student_name or student_id} not found in database'
            })
        
        # Check if attendance already exists for today
        existing_attendance = Attendance.query.filter(
            and_(
                Attendance.student_id == student.id,
                Attendance.date == attendance_date
            )
        ).first()
        
        if existing_attendance:
            return jsonify({
                'success': True,
                'message': f'Attendance already marked for {student.name} today',
                'already_marked': True
            })
        
        # Create new attendance record
        new_attendance = Attendance(
            student_id=student.id,
            date=attendance_date,
            status=status
        )
        
        db.session.add(new_attendance)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Attendance marked for {student.name}',
            'student_name': student.name,
            'student_id': student.student_id,
            'section': student.section
        })
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error marking attendance: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f'Error marking attendance: {str(e)}'
        })

from sqlalchemy import and_
@app.route('/api/today_attendance', methods=['GET'])
def today_attendance():
    try:
        today = date.today()
        
        # Count today's attendance
        attendance_count = Attendance.query.filter_by(date=today).count()
        
        # Get list of students marked present today
        # Get all data first, then compute names in Python
        today_attendance_data = db.session.query(
            Student.first_name,
            Student.middle_initial,
            Student.last_name,
            Student.student_id,
            Student.section
        ).join(
            Attendance, 
            Student.id == Attendance.student_id
        ).filter(
            Attendance.date == today
        ).all()
        
        # Build the attendance list with computed names
        attendance_list = []
        for data in today_attendance_data:
            # Build the name manually
            if data.middle_initial:
                full_name = f"{data.first_name} {data.middle_initial}. {data.last_name}"
            else:
                full_name = f"{data.first_name} {data.last_name}"
            
            attendance_list.append({
                'name': full_name,
                'student_id': data.student_id,
                'section': data.section
            })
        
        return jsonify({
            'success': True,
            'date': today.isoformat(),
            'count': attendance_count,
            'attendance_list': attendance_list
        })
        
    except Exception as e:
        import traceback
        print(f"❌ Error fetching attendance: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': f'Error fetching attendance: {str(e)}'
        })

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        
        print("🚀 Starting Flask application...")
        print("📷 Camera will initialize only when needed (face enrollment or recognition)")
        
        # Get sections from database (now inside app context)
        all_sections = get_all_sections_with_defaults()
        print(f"📊 All sections in database: {all_sections}")
        
        # Create default sections if they don't exist
        with system_lock:
            for section in DEFAULT_SECTIONS:
                face_system.create_section(section)
                print(f"✅ Created section in face system: {section}")
            
            # Also add sections from teachers
            for section in all_sections:
                if section not in DEFAULT_SECTIONS:
                    try:
                        face_system.create_section(section)
                        print(f"✅ Added teacher section to face system: {section}")
                    except Exception as e:
                        print(f"⚠️ Section {section} may already exist: {e}")
    
    app.run(debug=True, host='0.0.0.0', port=5000)