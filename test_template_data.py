import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'SmartC'))

from flask import Flask
from Sub_app.models import db, get_student_analytics
import json

app = Flask(__name__)

# Use single database at project root
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, 'instance', 'smartclassroom.db')
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DATABASE_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    print("=" * 70)
    print("CHECKING WHAT DATA IS BEING PASSED TO TEMPLATE")
    print("=" * 70)
    
    # Simulate what the dashboard route does
    from Sub_app.models import Teacher
    
    # Get a teacher (assuming first one)
    teacher = Teacher.query.first()
    if teacher:
        score_weight = teacher.score_weight
        attendance_weight = teacher.attendance_weight
        print(f"\nTeacher: {teacher.name}")
        print(f"Score Weight: {score_weight}")
        print(f"Attendance Weight: {attendance_weight}")
    else:
        score_weight = 0.7
        attendance_weight = 0.3
        print("\nNo teacher found, using defaults")
    
    # Get analytics (same as dashboard route)
    raw_student = get_student_analytics(score_weight=score_weight, attendance_weight=attendance_weight)
    
    print(f"\nNumber of students in raw_student: {len(raw_student)}")
    
    for student in raw_student:
        print(f"\n{'='*60}")
        print(f"Student: {student['first_name']} {student['last_name']}")
        print(f"Student ID: {student['student_id']}")
        print(f"\nData that would be in data attributes:")
        print(f"  data-student-id: {student['student_id']}")
        print(f"  data-name: {student['first_name']} {student.get('middle_initial', '')} {student['last_name']}")
        print(f"  data-grade: {student['grade_level']}")
        print(f"  data-section: {student['section']}")
        print(f"  data-attendance: {student['attendance']}")
        print(f"  data-present_count: {student['present_count']}")
        print(f"  data-late_count: {student['late_count']}")
        print(f"  data-absent_count: {student['absent_count']}")
        
        print(f"\n  Subject Scores (JSON):")
        print(f"  data-subject_scores: {json.dumps(student['subject_scores'])}")
        print(f"  data-raw_subject_scores: {json.dumps(student['raw_subject_scores'])}")
        print(f"  data-subject_totals: {json.dumps(student['subject_totals'])}")
        print(f"  data-subject_counts: {json.dumps(student['subject_counts'])}")
        
        print(f"\n  Detailed breakdown:")
        for subject in student['subject_scores'].keys():
            print(f"    {subject}:")
            print(f"      - Count: {student['subject_counts'].get(subject, 0)}")
            print(f"      - Total Sum: {student['subject_totals'].get(subject, 0)}")
            print(f"      - Raw Average: {student['raw_subject_scores'].get(subject, 0)}")
            print(f"      - Weighted Score: {student['subject_scores'].get(subject, 0)}")
