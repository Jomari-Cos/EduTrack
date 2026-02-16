import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'SmartC'))

from flask import Flask
from Sub_app.models import db, get_student_analytics, Teacher
import time

app = Flask(__name__, template_folder='SmartC/templates')

# Use single database at project root
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, 'instance', 'smartclassroom.db')
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DATABASE_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    print("=" * 70)
    print("SIMULATING DASHBOARD ROUTE")
    print("=" * 70)
    
    # Get teacher
    teacher = Teacher.query.first()
    score_weight = teacher.score_weight if teacher else 0.7
    attendance_weight = teacher.attendance_weight if teacher else 0.3
    
    print(f"\nTeacher: {teacher.name if teacher else 'None'}")
    print(f"Score Weight: {score_weight}, Attendance Weight: {attendance_weight}")
    
    # Get analytics - EXACTLY like dashboard route
    raw_student = get_student_analytics(score_weight=score_weight, attendance_weight=attendance_weight)
    
    print(f"\nraw_student variable contains {len(raw_student)} students")
    
    # Check each student
    for student in raw_student:
        print(f"\n{'='*60}")
        print(f"Student: {student['first_name']} {student['last_name']}")
        print(f"student_id: {student['student_id']}")
        
        # Check if keys exist
        has_subject_scores = 'subject_scores' in student
        has_raw = 'raw_subject_scores' in student
        has_totals = 'subject_totals' in student
        has_counts = 'subject_counts' in student
        
        print(f"\nKeys present:")
        print(f"  ✓ subject_scores: {has_subject_scores} - {student.get('subject_scores', 'MISSING')}")
        print(f"  ✓ raw_subject_scores: {has_raw} - {student.get('raw_subject_scores', 'MISSING')}")
        print(f"  ✓ subject_totals: {has_totals} - {student.get('subject_totals', 'MISSING')}")
        print(f"  ✓ subject_counts: {has_counts} - {student.get('subject_counts', 'MISSING')}")
        
        # Simulate what Jinja2 would do
        import json
        if has_subject_scores:
            print(f"\nWhat | tojson would produce:")
            print(f"  subject_scores | tojson: {json.dumps(student['subject_scores'])}")
            print(f"  raw_subject_scores | tojson: {json.dumps(student['raw_subject_scores'])}")
            print(f"  subject_totals | tojson: {json.dumps(student['subject_totals'])}")
            print(f"  subject_counts | tojson: {json.dumps(student['subject_counts'])}")
