from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from tabulate import tabulate  # pip install tabulate
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from sqlalchemy import func
import json
import os

# -----------------------------
# Initialize Database and Migrate
# -----------------------------
db = SQLAlchemy()
migrate = Migrate()


# ====================================================
# STUDENT MODEL
# ====================================================
class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    middle_initial = db.Column(db.String(5), nullable=True)
    last_name = db.Column(db.String(50), nullable=False)
    student_id = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    grade_level = db.Column(db.String(20), nullable=False)
    section = db.Column(db.String(50), nullable=False)
    contact_info = db.Column(db.String(20), nullable=True)
    guardian_name = db.Column(db.String(100), nullable=False)
    guardian_contact = db.Column(db.String(20), nullable=False)
    image = db.Column(db.String(200), nullable=True)  # path or filename

    def __repr__(self):
        return f"<Student {self.first_name} {self.last_name} - Grade {self.grade_level} {self.section}>"

    @property
    def name(self):
        """Return full name with middle initial if available."""
        return f"{self.first_name} {self.middle_initial + '. ' if self.middle_initial else ''}{self.last_name}"


# ====================================================
# ATTENDANCE MODEL
# ====================================================
from datetime import datetime, date

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("student.id"), nullable=False)
    date = db.Column(db.Date, default=date.today, nullable=False)  # ✅ callable
    status = db.Column(db.String(10), nullable=False)

    student = db.relationship("Student", backref="attendances")


from datetime import datetime, date

# ====================================================
# TEACHER MODEL
# ====================================================
class Teacher(db.Model):
    __tablename__ = "teachers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    teacher_id = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=True)  # <-- added
    assigned_classes = db.Column(db.Text, nullable=True)
    gender = db.Column(db.String(10), nullable=True)
    contact_info = db.Column(db.String(50), nullable=True)

    rfid_code = db.Column(db.String(50), unique=True, nullable=True)
    photo = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # -----------------------------
    # Password Handling
    # -----------------------------
    def set_password(self, raw_password):
        self.password = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password, raw_password)

    # -----------------------------
    # Assigned Classes
    # -----------------------------
    def set_classes(self, classes_list):
        if isinstance(classes_list, list):
            try:
                self.assigned_classes = json.dumps(classes_list)
            except (TypeError, ValueError):
                self.assigned_classes = "[]"
        else:
            self.assigned_classes = "[]"

    def get_classes(self):
        if not self.assigned_classes:
            return []
        try:
            return json.loads(self.assigned_classes)
        except (json.JSONDecodeError, TypeError):
            return []

    def get_class_display(self):
        return [
            f"Grade {c.get('grade')} - {c.get('section')} | {c.get('subject')}"
            for c in self.get_classes()
        ]

    # -----------------------------
    # Age Property
    # -----------------------------
    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = date.today()
        years = today.year - self.date_of_birth.year
        # Adjust if birthday hasn't occurred yet this year
        if (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day):
            years -= 1
        return years

    # -----------------------------
    # Representation
    # -----------------------------
    def __repr__(self):
        return f"<Teacher {self.name} ({self.teacher_id})>"



# ====================================================
# SCORE MODEL
# ====================================================
class Score(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), db.ForeignKey("student.student_id"), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    points = db.Column(db.Integer, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)


# ====================================================
# PASSWORD RESET TOKEN MODEL
# ====================================================
import secrets
from datetime import datetime, timedelta

class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"
    
    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.String(50), db.ForeignKey("teachers.teacher_id"), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    
    teacher = db.relationship("Teacher", backref="reset_tokens")
    
    def __init__(self, teacher_id, expiry_minutes=60):
        self.teacher_id = teacher_id
        self.token = secrets.token_urlsafe(32)
        self.created_at = datetime.utcnow()
        self.expires_at = datetime.utcnow() + timedelta(minutes=expiry_minutes)
        self.used = False
    
    def is_valid(self):
        """Check if token is still valid (not expired and not used)"""
        return not self.used and datetime.utcnow() < self.expires_at
    
    def mark_as_used(self):
        """Mark token as used"""
        self.used = True
    
    def __repr__(self):
        return f"<PasswordResetToken {self.teacher_id} - {'Valid' if self.is_valid() else 'Invalid'}>"


# ====================================================
# ANALYTICS HELPER (UPDATED WITH WEIGHTED SUBJECT SCORES)
# ====================================================
def get_student_analytics(grade="", section="", subject=""):
    """Compute attendance %, average score, and per-subject weighted scores (70% scores + 30% attendance)."""
    students_data = []
    
    # Build base query with filters
    query = Student.query
    
    if grade:
        query = query.filter(Student.grade_level == grade)
    if section:
        query = query.filter(Student.section == section)
    
    all_students = query.all()

    for student in all_students:
        # Attendance calculations
        attendance_query = Attendance.query.filter_by(student_id=student.id)
        total_days = attendance_query.count()
        present_days = attendance_query.filter_by(status="Present").count()
        absent_count = attendance_query.filter_by(status="Absent").count()
        late_count = attendance_query.filter_by(status="Late").count()
        attendance_percentage = round((present_days / total_days) * 100, 2) if total_days > 0 else 0

        # Score calculations with subject filter
        if subject:
            subjects_to_query = [subject]
        else:
            subjects_to_query = [s.subject for s in db.session.query(Score.subject)
                                 .filter_by(student_id=student.student_id)
                                 .distinct()]
        
        subject_score_dict = {}
        for subj in subjects_to_query:
            # Average score for this subject
            avg_score = db.session.query(func.avg(Score.points))\
                .filter_by(student_id=student.student_id, subject=subj)\
                .scalar()
            avg_score = round(avg_score or 0, 2)

            # Weighted score: 70% from avg_score + 30% from attendance
            weighted_score = round((avg_score * 0.7) + (attendance_percentage * 0.3), 2)

            subject_score_dict[subj] = weighted_score

        # Overall average (across all subjects) weighted by attendance
        if subject_score_dict:
            overall_avg = round(sum(subject_score_dict.values()) / len(subject_score_dict), 2)
        else:
            overall_avg = 0

        students_data.append({
            "student_id": student.student_id,
            "first_name": student.first_name,
            "middle_initial": student.middle_initial,
            "last_name": student.last_name,
            "grade_level": student.grade_level,
            "section": student.section,
            "attendance": attendance_percentage,
            "present_count": present_days,
            "absent_count": absent_count,
            "late_count": late_count,
            "average_score": overall_avg,
            "image": student.image,
            "subject_scores": subject_score_dict,
        })

    return students_data


# ====================================================
# RUN (for debugging)
# ====================================================
if __name__ == "__main__":
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///smartclassroom.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        db.create_all()
        print("✅ Database initialized successfully.")

 

    with app.app_context():
        # Make sure tables exist
        db.create_all()
        migrate.init_app(app, db)

        # ✅ Create sample teacher with subjects if none exist
        if not Teacher.query.first():
            t1 = Teacher(name="Mr. Smith", teacher_id="T001", email="smith@example.com")
            t1.set_password("123456")
            # Add assigned classes with subjects
            t1.set_classes([
                {"grade": "12", "section": "ABM", "subject": "Practical Research"},
                {"grade": "12", "section": "ABM", "subject": "Entrepreneurship"}
            ])
            db.session.add(t1)
            db.session.commit()
            print("✅ Sample teacher added with password '123456' and assigned classes")
  # Print Students as a table
        print("=== Students ===")
        students = Student.query.all()
        if students:
            table = [
                [
                    s.id,
                    f"{s.first_name} {s.middle_initial or ''} {s.last_name}".strip(),
                    s.student_id,
                    s.email,
                    f"Grade {s.grade_level} - {s.section}",
                    s.date_of_birth.strftime("%Y-%m-%d") if s.date_of_birth else "N/A",
                    s.gender,
                    s.contact_info or "N/A",
                    s.guardian_name or "N/A",
                    s.guardian_contact or "N/A",
                    s.image or "N/A"
                ]
                for s in students
            ]
            headers = [
                "ID", "Name", "Student ID", "Email", "Class",
                "DOB", "Gender", "Contact", "Guardian", "Guardian Contact", "Image"
            ]
            print(tabulate(table, headers, tablefmt="grid"))
        else:
            print("No students found.")

         # -----------------------------
        # Print Teachers
        # -----------------------------
        print("\n=== Teachers ===")
        teachers = Teacher.query.all()
        if teachers:
            table = []
            for t in teachers:
                # Format assigned classes safely
                assigned_str = "None"
                assigned_list = t.get_classes()  # convert JSON string to Python list
                assigned_str = ", ".join([
                    f"Grade {c.get('grade', '?')} - {c.get('section', '?')} ({c.get('subject', 'No Subject')})"
                    for c in assigned_list
                ]) if assigned_list else "None"

                table.append([
                    t.id,
                    t.name,
                    t.teacher_id,
                    t.email,
                    t.password[:20] + "...",
                    assigned_str,
                    t.rfid_code or "N/A"
                ])

            headers = ["ID", "Name", "Teacher ID", "Email", "Password (hashed)", "Assigned Classes","RFID"]
            print(tabulate(table, headers, tablefmt="grid"))
        else:
            print("No teachers found.")


        # ✅ Print Attendance
        print("\n=== Attendance ===")
        records = Attendance.query.all()
        if records:
            table = [
                [a.id, f"{a.student.first_name} {a.student.last_name}", a.student.student_id, a.date, a.status]
                for a in records
            ]
            headers = ["ID", "Name", "Student ID", "Date", "Status"]
            print(tabulate(table, headers, tablefmt="grid"))
        else:
            print("No attendance records found.")
            
            # ✅ Print Scores
        print("\n=== Scores ===")
        scores = Score.query.all()
        if scores:
            table = []
            for sc in scores:
                # Try to fetch related student object using student_id
                student = Student.query.filter_by(student_id=sc.student_id).first()
                student_name = student.name if student else "Unknown"
                grade_info = f"Grade {student.grade_level} - {student.section}" if student else "N/A"

                table.append([
                    sc.id,
                  
                    sc.student_id,
                  
                    sc.subject,
                    sc.points,
                    sc.date.strftime("%Y-%m-%d %H:%M:%S") if sc.date else "N/A"
                ])

            headers = ["ID", "Student ID", "Subject", "Points", "Date"]
            print(tabulate(table, headers, tablefmt="grid"))
        else:
            print("No scores found.")
            
        # ✅ Print Student Analytics
        print("\n=== Student Analytics ===")
        analytics = get_student_analytics()
        if analytics:
            table = [
                [
                    f"{s['first_name']} {s['middle_initial'] or ''} {s['last_name']}".strip(),
                    s['student_id'],
                    f"{s['attendance']}%",
                    f"{s['average_score']}%",
                    f"Grade {s['grade_level']} - {s['section']}"
                ]
                for s in analytics
            ]
            headers = ["Name", "Student ID", "Attendance", "Average Score", "Class"]
            print(tabulate(table, headers, tablefmt="grid"))
        else:
            print("No student analytics available.")

    