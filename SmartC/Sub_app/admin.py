from flask import Blueprint, render_template, request, redirect, url_for, flash
from .models import db, Student, Teacher, SystemSettings
import os
from werkzeug.utils import secure_filename
from flask import current_app
import uuid
from werkzeug.security import generate_password_hash
import json
from datetime import datetime

import os
import pickle
import base64
import cv2
import numpy as np
from flask import Blueprint, request, jsonify, render_template
from concurrent.futures import ThreadPoolExecutor
import face_recognition

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

# -----------------------------
# Admin Dashboard
# -----------------------------
@admin_bp.route("/")
def admin_dashboard():
    """Admin dashboard with system settings."""
    students = Student.query.all()
    teachers = Teacher.query.all()
    teachers_json = [{"id": t.id, "name": t.name} for t in teachers]
    
    # Get total counts
    total_students = Student.query.count()
    total_teachers = Teacher.query.count()
    
    # Count registered faces from face_database.pkl (same as face_list page)
    total_face_encodings = 0
    # Use the root directory's face_database.pkl (same level as SmartC folder)
    face_db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'face_database.pkl')
    
    if os.path.exists(face_db_path):
        try:
            with open(face_db_path, 'rb') as f:
                face_database = pickle.load(f)
                # Count total persons across all sections
                for section_name, section_data in face_database.get('sections', {}).items():
                    total_face_encodings += len(section_data)
        except Exception as e:
            print(f"Error loading face database: {e}")
            total_face_encodings = 0
    
    # Get or create system settings
    system_settings = SystemSettings.query.first()
    if not system_settings:
        system_settings = SystemSettings()
        db.session.add(system_settings)
        db.session.commit()
    
    return render_template(
        "admin.html",
        students=students,
        teachers=teachers,
        teachers_json=teachers_json,
        system_settings=system_settings,
        total_students=total_students,
        total_teachers=total_teachers,
        total_face_encodings=total_face_encodings
    )

@admin_bp.route("/students")
def view_students():
    students = Student.query.all()
    
    # Get or create system settings
    system_settings = SystemSettings.query.first()
    if not system_settings:
        system_settings = SystemSettings()
        db.session.add(system_settings)
        db.session.commit()
    
    return render_template("database.html", students=students, system_settings=system_settings)

from flask import jsonify
# -----------------------------
# Add Student
# -----------------------------
@admin_bp.route("/add_student", methods=["POST"])
def add_student():
    from datetime import datetime
    import os, uuid
    from werkzeug.utils import secure_filename
    from flask import flash, redirect, url_for, current_app, request

    try:
        # -----------------------------
        # Collect form data
        # -----------------------------
        first_name = request.form.get("first_name", "").strip()
        last_name = request.form.get("last_name", "").strip()
        student_id = request.form.get("student_id", "").strip()
        email = request.form.get("student_email", "").strip()
        dob_str = request.form.get("date_of_birth", "").strip()
        gender = request.form.get("gender", "").strip()
        grade_level = request.form.get("grade_level", "").strip()
        section = request.form.get("section", "").strip()
        guardian_name = request.form.get("guardian_name", "").strip()
        guardian_contact = request.form.get("guardian_contact", "").strip()

        # Optional
        middle_initial = request.form.get("middle_initial", "").strip()
        contact_info = request.form.get("contact_info", "").strip()

        # Action (accept/decline)
        next_action = request.form.get("next_action", "decline")  # default to decline

        # -----------------------------
        # Validate required fields
        # -----------------------------
        required_fields = [first_name, last_name, student_id, email, dob_str, gender,
                           grade_level, section, guardian_name, guardian_contact]
        if not all(required_fields):
            flash("⚠️ Please fill in all required fields.", "error")
            return redirect(url_for("admin.admin_dashboard"))

        # Parse date
        try:
            date_of_birth = datetime.strptime(dob_str, "%Y-%m-%d").date()
        except ValueError:
            flash("⚠️ Invalid date format. Use YYYY-MM-DD.", "error")
            return redirect(url_for("admin.admin_dashboard"))

        # -----------------------------
        # Handle photo upload
        # -----------------------------
        photo = request.files.get("student_photo")
        filename = None
        if photo and photo.filename.strip():
            upload_folder = os.path.join(current_app.root_path, "static", "uploads", "students")
            os.makedirs(upload_folder, exist_ok=True)
            filename = f"{uuid.uuid4().hex}_{secure_filename(photo.filename)}"
            photo.save(os.path.join(upload_folder, filename))

        # -----------------------------
        # Check duplicates
        # -----------------------------
        if Student.query.filter_by(email=email).first():
            flash("⚠️ A student with this email already exists!", "error")
            return redirect(url_for("admin.admin_dashboard"))
        if Student.query.filter_by(student_id=student_id).first():
            flash("⚠️ A student with this ID already exists!", "error")
            return redirect(url_for("admin.admin_dashboard"))

        # -----------------------------
        # Add student to DB
        # -----------------------------
        new_student = Student(
            first_name=first_name,
            middle_initial=middle_initial or None,
            last_name=last_name,
            student_id=student_id,
            email=email,
            date_of_birth=date_of_birth,
            gender=gender,
            grade_level=grade_level,
            section=section,
            contact_info=contact_info or None,
            guardian_name=guardian_name,
            guardian_contact=guardian_contact,
            image=filename
        )
        db.session.add(new_student)
        db.session.commit()

        flash("✅ Student added successfully!", "success")

        # -----------------------------
        # Redirect based on action
        # -----------------------------
        if next_action == "accept":
            # Redirect to register page
            return redirect(url_for("admin.register", name=f"{first_name} {last_name}", student_id=student_id, grade_level=grade_level, section=section))
        else:
            # Redirect back to dashboard
            return redirect(url_for("admin.admin_dashboard"))

    except Exception as e:
        flash(f"⚠️ Unexpected error: {str(e)}", "error")
        return redirect(url_for("admin.admin_dashboard"))



# -----------------------------
# Add Teacher
# -----------------------------
@admin_bp.route("/add_teacher", methods=["POST"])
def add_teacher():
    try:
        # -----------------------------
        # Collect form data
        # -----------------------------
        first_name = request.form.get("first_name", "").strip()
        middle_initial = request.form.get("middle_initial", "").strip()
        last_name = request.form.get("last_name", "").strip()

        name_parts = [first_name, middle_initial, last_name]
        name = " ".join(part for part in name_parts if part).strip()

        teacher_id = request.form.get("teacher_id")
        email = request.form.get("teacher_email")
        password = request.form.get("teacher_password")
        date_of_birth_str = request.form.get("date_of_birth")
        gender = request.form.get("gender")
        contact_info = request.form.get("contact_info")
        rfid_code = request.form.get("rfid_code")
        photo = request.files.get("teacher_photo")
        assigned_classes_json = request.form.get("assigned_classes")

        # -----------------------------
        # Convert date
        # -----------------------------
        date_of_birth = None
        if date_of_birth_str:
            try:
                date_of_birth = datetime.strptime(date_of_birth_str, "%Y-%m-%d").date()
            except ValueError:
                flash("⚠️ Invalid date format.", "error")
                return redirect(url_for("admin.admin_dashboard"))

        # -----------------------------
        # Duplicate checks
        # -----------------------------
        if Teacher.query.filter_by(email=email).first():
            flash("⚠️ A teacher with this email already exists!", "error")
            return redirect(url_for("admin.admin_dashboard"))

        if Teacher.query.filter_by(teacher_id=teacher_id).first():
            flash("⚠️ A teacher with this ID already exists!", "error")
            return redirect(url_for("admin.admin_dashboard"))

        # -----------------------------
        # Hash password
        # -----------------------------
        hashed_password = generate_password_hash(password)

        # -----------------------------
        # Create new Teacher object
        # -----------------------------
        new_teacher = Teacher(
            name=name,
            teacher_id=teacher_id,
            email=email,
            password=hashed_password,
            date_of_birth=date_of_birth,
            gender=gender,
            contact_info=contact_info,
            rfid_code=rfid_code or None,
            created_at=datetime.utcnow()
        )

        # -----------------------------
        # Handle photo upload
        # -----------------------------
        if photo and photo.filename != "":
            from werkzeug.utils import secure_filename
            import os

            # Ensure folder exists
            upload_folder = os.path.join(os.getcwd(), "static", "uploads", "teachers")
            os.makedirs(upload_folder, exist_ok=True)

            # Make a safe filename
            filename = secure_filename(photo.filename)
            filename = f"{teacher_id}_{filename}"  # prepend teacher_id to avoid duplicates

            # Save file
            file_path = os.path.join(upload_folder, filename)
            photo.save(file_path)

            # Store relative path for Flask
            new_teacher.photo = f"uploads/teachers/{filename}"

        # -----------------------------
        # Save assigned classes
        # -----------------------------
        if assigned_classes_json:
            try:
                assigned_classes = json.loads(assigned_classes_json)
                new_teacher.set_classes(assigned_classes)
            except Exception as e:
                print(f"Error saving classes: {e}")
                flash("⚠️ Failed to save assigned classes.", "error")

        # -----------------------------
        # Commit to database
        # -----------------------------
        db.session.add(new_teacher)
        db.session.commit()

        flash("✅ Teacher added successfully!", "success")
        return redirect(url_for("admin.admin_dashboard"))

    except Exception as e:
        db.session.rollback()
        print("❌ Error adding teacher:", e)
        flash("⚠️ Failed to add teacher. Please try again.", "error")
        return redirect(url_for("admin.admin_dashboard"))



@admin_bp.route('/face_enrollment')
def face_enrollment():
    return render_template('face_enrollment.html')

import cv2
from flask import Response

@admin_bp.route('/face_enrollment_video_feed')
def face_enrollment_video_feed():
    def generate():
        cap = cv2.VideoCapture(0)
        while True:
            success, frame = cap.read()
            if not success:
                break
            else:
                ret, buffer = cv2.imencode('.jpg', frame)
                frame = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        cap.release()
    
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')




@admin_bp.route("/api/teacher/<int:teacher_id>", methods=["DELETE"])
def delete_teacher(teacher_id):
    teacher = Teacher.query.get(teacher_id)
    if not teacher:
        return jsonify({"error": "Teacher not found"}), 404

    db.session.delete(teacher)
    db.session.commit()
    return jsonify({"message": "Teacher deleted successfully"})

@admin_bp.route("/api/teacher/<int:teacher_id>", methods=["GET", "PUT"])
def teacher_detail(teacher_id):
    teacher = Teacher.query.get(teacher_id)
    if not teacher:
        return jsonify({"error": "Teacher not found"}), 404

    # -------------------------
    # 🔹 GET Teacher Details
    # -------------------------
    if request.method == "GET":
        try:
            # Ensure it's a list of dicts
            raw_classes = teacher.assigned_classes
            if isinstance(raw_classes, str):
                import json
                try:
                    assigned_classes = json.loads(raw_classes)
                except json.JSONDecodeError:
                    assigned_classes = []
            else:
                assigned_classes = raw_classes or []
        except Exception as e:
            print(f"Error parsing classes for {teacher.name}: {e}")
            assigned_classes = []

        return jsonify({
            "id": teacher.id,
            "name": teacher.name,
            "email": teacher.email,
            "gender": teacher.gender,
            "contact_info": teacher.contact_info,
            "assigned_classes": assigned_classes,  # ✅ send full objects
        })

    # -------------------------
    # 🔹 PUT = Update Teacher
    # -------------------------
    data = request.get_json()
    teacher.name = data.get("name", teacher.name)
    teacher.email = data.get("email", teacher.email)
    teacher.gender = data.get("gender", teacher.gender)
    teacher.contact_info = data.get("contact_info", teacher.contact_info)

    if "assigned_classes" in data:
        import json
        teacher.assigned_classes = json.dumps(data["assigned_classes"])

    db.session.commit()
    return jsonify({"message": "Teacher updated successfully"})


@admin_bp.route("/api/teacher/<int:teacher_id>", methods=["PUT"])
def update_teacher(teacher_id):
    teacher = Teacher.query.get(teacher_id)
    if not teacher:
        return jsonify({"error": "Teacher not found"}), 404

    data = request.get_json()

    teacher.name = data.get("name", teacher.name)
    teacher.email = data.get("email", teacher.email)
    teacher.gender = data.get("gender", teacher.gender)
    teacher.contact_info = data.get("contact_info", teacher.contact_info)

    # Save assigned classes as JSON string
    import json
    teacher.assigned_classes = json.dumps(data.get("assigned_classes", []))

    db.session.commit()
    return jsonify({"message": "Teacher updated successfully"})


@admin_bp.route("/api/teachers")
def get_teachers():
    teachers = Teacher.query.all()
    data = []

    for t in teachers:
        try:
            # Get classes as JSON objects (not formatted strings)
            classes = t.get_classes()  # This returns list of dicts with grade, section, subject
            if not classes:
                classes = []
        except Exception as e:
            print(f"Error loading classes for {t.name}: {e}")
            classes = []

        # ✅ Construct full photo path (for static folder)
        photo_path = None
        if t.photo:
            # Normalize the path to use /static/uploads/teachers/
            if t.photo.startswith(('http://', 'https://')):
                photo_path = t.photo
            elif t.photo.startswith('/static/uploads/teachers/'):
                # Already correct format
                photo_path = t.photo
            elif t.photo.startswith('/static/uploads/'):
                # Add teachers subdirectory
                photo_path = t.photo.replace('/static/uploads/', '/static/uploads/teachers/')
            elif t.photo.startswith('uploads/teachers/'):
                # Add /static/ prefix
                photo_path = f"/{t.photo}".replace('uploads/', 'static/uploads/')
            elif t.photo.startswith('uploads/'):
                # Add /static/ prefix and teachers subdirectory
                photo_path = f"/{t.photo}".replace('uploads/', 'static/uploads/teachers/')
            else:
                # Just a filename
                photo_path = f"/static/uploads/teachers/{t.photo}"

        data.append({
            "id": t.id,
            "name": t.name,
            "teacher_id": t.teacher_id,
            "email": t.email,
            "gender": t.gender or "N/A",
            "contact_info": t.contact_info or "N/A",
            "age": t.age if t.age is not None else "N/A",
            "assigned_classes": classes,   # ✅ now guaranteed to be a list of dicts
            "photo": photo_path,
        })

    return jsonify(data)


# ====================================================
# 📘 STUDENTS API
# ====================================================
@admin_bp.route("/api/student/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    """API endpoint to update student information."""
    try:
        student = Student.query.get(student_id)
        if not student:
            return jsonify({"success": False, "error": "Student not found"}), 404
        
        data = request.get_json()
        
        # Update fields
        student.first_name = data.get('first_name', student.first_name)
        student.last_name = data.get('last_name', student.last_name)
        student.middle_initial = data.get('middle_initial', student.middle_initial)
        student.student_id = data.get('student_id', student.student_id)
        student.email = data.get('email', student.email)
        student.gender = data.get('gender', student.gender)
        student.grade_level = data.get('grade_level', student.grade_level)
        student.section = data.get('section', student.section)
        student.contact_info = data.get('contact_info', student.contact_info)
        student.guardian_name = data.get('guardian_name', student.guardian_name)
        student.guardian_contact = data.get('guardian_contact', student.guardian_contact)
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Student updated successfully"
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@admin_bp.route("/api/students", methods=["GET"])
def get_students():
    students = Student.query.all()
    student_list = [
        {
            "id": s.id,
            "student_id": s.student_id,
            "first_name": s.first_name,
            "middle_initial": s.middle_initial or "",
            "last_name": s.last_name,
            "name": s.name,
            "email": s.email,
            "gender": s.gender,
            "grade_level": s.grade_level,
            "section": s.section,
            "guardian_name": s.guardian_name,
            "guardian_contact": s.guardian_contact,
            "contact_info": s.contact_info,
            "image": s.image or "",
        }
        for s in students
    ]
    return jsonify(student_list)




from flask import Blueprint, request, jsonify, render_template
import os, cv2, base64, pickle, numpy as np
import face_recognition
from concurrent.futures import ThreadPoolExecutor


ENCODINGS_PATH = "dataset/encodings.pkl"

# Load existing data or initialize
if os.path.exists(ENCODINGS_PATH):
    with open(ENCODINGS_PATH, "rb") as f:
        data = pickle.load(f)
        known_face_encodings = data.get("encodings", [])
        known_face_names = data.get("names", [])
        known_face_ids = data.get("ids", [])
        known_face_grades = data.get("grades", [])
        known_face_sections = data.get("sections", [])
else:
    known_face_encodings = []
    known_face_names = []
    known_face_ids = []
    known_face_grades = []
    known_face_sections = []

# Camera setup
camera = cv2.VideoCapture(0)

# Registration page
@admin_bp.route('/register')
def register():
    return render_template(
        "face_register.html",
        name=request.args.get('name', ''),
        student_id=request.args.get('student_id', ''),
        grade_level=request.args.get('grade_level', ''),
        section=request.args.get('section', '')
    )

# Capture current live frame
@admin_bp.route('/camera_frame')
def camera_frame():
    ret, frame = camera.read()
    if not ret:
        return Response(status=500)
    _, jpeg = cv2.imencode('.jpg', frame)
    return Response(jpeg.tobytes(), mimetype='image/jpeg')

# Capture frame for registration (base64)
@admin_bp.route('/capture_frame')
def capture_frame():
    ret, frame = camera.read()
    if not ret:
        return jsonify({"status": "failed", "message": "Camera read failed"}), 500
    _, jpeg = cv2.imencode('.jpg', frame)
    encoded = "data:image/jpeg;base64," + base64.b64encode(jpeg.tobytes()).decode('utf-8')
    return jsonify({"frame": encoded})

@admin_bp.route('/face_list')
def register_page():
    return render_template('face_List.html')

# Register face route
@admin_bp.route('/register_face', methods=['POST'])
def register_face():
    data = request.json
    frames = data.get('frames', [])
    name = data.get('name')
    student_id = data.get('studentId')
    grade_level = data.get('gradeLevel')
    section = data.get('section')

    if not all([name, student_id, grade_level, section, frames]):
        return jsonify({"status": "failed", "message": "Missing required fields or frames!"}), 400

    def encode_frame(img_data):
        try:
            img_bytes = base64.b64decode(img_data.split(',')[1])
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                return None
            enc = face_recognition.face_encodings(frame)
            return enc[0] if enc else None
        except Exception as e:
            print("Error encoding frame:", e)
            return None

    try:
        with ThreadPoolExecutor(max_workers=5) as executor:
            all_encodings = list(executor.map(encode_frame, frames))
            encodings = [enc for enc in all_encodings if enc is not None]

        if not encodings:
            return jsonify({"status": "failed", "message": "No face detected in frames!"}), 400

        avg_encoding = np.mean(encodings, axis=0)

        known_face_encodings.append(avg_encoding)
        known_face_names.append(name)
        known_face_ids.append(student_id)
        known_face_grades.append(grade_level)
        known_face_sections.append(section)

        os.makedirs("dataset", exist_ok=True)
        with open(ENCODINGS_PATH, "wb") as f:
            pickle.dump({
                "encodings": known_face_encodings,
                "names": known_face_names,
                "ids": known_face_ids,
                "grades": known_face_grades,
                "sections": known_face_sections
            }, f)

        return jsonify({"status": "success", "message": f"{name} ({student_id}) registered successfully!"})

    except Exception as e:
        print("Server error:", e)
        return jsonify({"status": "failed", "message": f"Server error: {e}"}), 500


# ====================================================
# 🔧 SYSTEM SETTINGS API
# ====================================================

@admin_bp.route("/api/upload-logo", methods=["POST"])
def upload_logo():
    """Upload school logo."""
    try:
        if 'logo' not in request.files:
            return jsonify({"success": False, "message": "No file uploaded"}), 400
        
        file = request.files['logo']
        
        if file.filename == '':
            return jsonify({"success": False, "message": "No file selected"}), 400
        
        # Validate file type (optional but recommended)
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'svg'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({
                "success": False, 
                "message": f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            }), 400
        
        # Generate unique filename
        filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
        
        # Save to static/uploads folder
        upload_folder = os.path.join(current_app.root_path, "static", "uploads")
        os.makedirs(upload_folder, exist_ok=True)
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        
        return jsonify({
            "success": True,
            "filename": filename,
            "message": "Logo uploaded successfully"
        })
    
    except Exception as e:
        print(f"Error uploading logo: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


def get_or_create_settings():
    """Helper function to get or create system settings."""
    settings = SystemSettings.query.first()
    if not settings:
        settings = SystemSettings()
        db.session.add(settings)
        db.session.commit()
    return settings


@admin_bp.route("/api/settings", methods=["GET"])
def get_settings():
    """Get current system settings."""
    try:
        settings = get_or_create_settings()
        
        return jsonify({
            "success": True,
            "settings": {
                # School Information
                "school_name": settings.school_name,
                "school_logo": settings.school_logo,
                "school_address": settings.school_address,
                "school_contact": settings.school_contact,
                "school_email": settings.school_email,
                
                # Academic Year
                "academic_year": settings.academic_year,
                "current_term": settings.current_term,
                
                # Grade Configuration
                "grade_levels": settings.get_grade_levels(),
                "sections_by_grade": settings.get_sections_by_grade(),
                "subjects_by_grade": settings.get_subjects_by_grade(),
                
                # Default Weights
                "default_score_weight": settings.default_score_weight,
                "default_attendance_weight": settings.default_attendance_weight,
                "allow_teacher_override": settings.allow_teacher_override,
                
                # System Preferences
                "minimum_attendance_percentage": settings.minimum_attendance_percentage,
                "passing_grade": settings.passing_grade,
                "honor_roll_grade": settings.honor_roll_grade,
            }
        })
    except Exception as e:
        print(f"Error getting settings: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@admin_bp.route("/api/settings", methods=["POST"])
def update_settings():
    """Update system settings."""
    try:
        settings = get_or_create_settings()
        data = request.get_json()
        
        # Update School Information
        if "school_name" in data:
            settings.school_name = data["school_name"]
        if "school_logo" in data:
            settings.school_logo = data["school_logo"]
        if "school_address" in data:
            settings.school_address = data["school_address"]
        if "school_contact" in data:
            settings.school_contact = data["school_contact"]
        if "school_email" in data:
            settings.school_email = data["school_email"]
        
        # Update Academic Year
        if "academic_year" in data:
            settings.academic_year = data["academic_year"]
        if "current_term" in data:
            settings.current_term = data["current_term"]
        
        # Update Grade Configuration
        if "grade_levels" in data:
            settings.set_grade_levels(data["grade_levels"])
        if "sections_by_grade" in data:
            settings.set_sections_by_grade(data["sections_by_grade"])
        if "subjects_by_grade" in data:
            settings.set_subjects_by_grade(data["subjects_by_grade"])
        
        # Update Default Weights
        if "default_score_weight" in data:
            weight = float(data["default_score_weight"])
            if 0 <= weight <= 1:
                settings.default_score_weight = weight
        if "default_attendance_weight" in data:
            weight = float(data["default_attendance_weight"])
            if 0 <= weight <= 1:
                settings.default_attendance_weight = weight
        if "allow_teacher_override" in data:
            settings.allow_teacher_override = bool(data["allow_teacher_override"])
        
        # Update System Preferences
        if "minimum_attendance_percentage" in data:
            settings.minimum_attendance_percentage = float(data["minimum_attendance_percentage"])
        if "passing_grade" in data:
            settings.passing_grade = float(data["passing_grade"])
        if "honor_roll_grade" in data:
            settings.honor_roll_grade = float(data["honor_roll_grade"])
        
        # Update timestamp
        settings.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Settings updated successfully",
            "settings": {
                "school_name": settings.school_name,
                "academic_year": settings.academic_year,
                "current_term": settings.current_term,
                "grade_levels": settings.get_grade_levels(),
                "sections_by_grade": settings.get_sections_by_grade(),
                "subjects_by_grade": settings.get_subjects_by_grade(),
            }
        })
    except ValueError as e:
        return jsonify({"success": False, "message": f"Invalid value: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error updating settings: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


@admin_bp.route("/api/dashboard-stats", methods=["GET"])
def dashboard_stats():
    """Get dashboard statistics for overview."""
    try:
        # Count teachers
        total_teachers = Teacher.query.count()
        
        # Count students
        total_students = Student.query.count()
        
        # Count registered faces from face database (like face_list page)
        total_faces = 0
        # Use the root directory's face_database.pkl (same level as SmartC folder)
        face_db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'face_database.pkl')
        
        print(f"[DEBUG] Looking for face database at: {face_db_path}")
        print(f"[DEBUG] File exists: {os.path.exists(face_db_path)}")
        
        if os.path.exists(face_db_path):
            try:
                with open(face_db_path, 'rb') as f:
                    face_database = pickle.load(f)
                    # Count total persons across all sections
                    for section_name, section_data in face_database.get('sections', {}).items():
                        total_faces += len(section_data)
                    print(f"[DEBUG] Total faces counted from face database: {total_faces}")
            except Exception as e:
                print(f"Error loading face database: {e}")
                # Fallback to counting from database records
                teachers_with_faces = Teacher.query.filter(Teacher.photo.isnot(None)).count()
                students_with_faces = Student.query.filter(Student.image.isnot(None)).count()
                total_faces = teachers_with_faces + students_with_faces
        else:
            # Fallback if face database doesn't exist
            teachers_with_faces = Teacher.query.filter(Teacher.photo.isnot(None)).count()
            students_with_faces = Student.query.filter(Student.image.isnot(None)).count()
            total_faces = teachers_with_faces + students_with_faces
        
        # Count unique classes from teachers
        unique_classes = set()
        teachers = Teacher.query.all()
        for teacher in teachers:
            if teacher.assigned_classes:
                try:
                    classes = json.loads(teacher.assigned_classes) if isinstance(teacher.assigned_classes, str) else teacher.assigned_classes
                    if isinstance(classes, list):
                        for cls in classes:
                            if isinstance(cls, dict):
                                grade = cls.get('grade', '')
                                section = cls.get('section', '')
                                if grade and section:
                                    unique_classes.add(f"{grade}-{section}")
                except:
                    pass
        
        total_classes = len(unique_classes)
        
        return jsonify({
            "success": True,
            "total_teachers": total_teachers,
            "total_students": total_students,
            "total_faces": total_faces,
            "total_classes": total_classes
        })
    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        return jsonify({
            "success": False,
            "message": str(e),
            "total_teachers": 0,
            "total_students": 0,
            "total_faces": 0,
            "total_classes": 0
        }), 500
