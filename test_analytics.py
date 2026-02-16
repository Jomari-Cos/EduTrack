import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'SmartC'))

from flask import Flask
from Sub_app.models import db, get_student_analytics

app = Flask(__name__)

# Use single database at project root
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, 'instance', 'smartclassroom.db')
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DATABASE_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    print("=" * 70)
    print("TESTING get_student_analytics FUNCTION")
    print("=" * 70)
    
    # Test with no filters
    print("\n1. Getting analytics for all students:")
    students_data = get_student_analytics()
    
    for student in students_data:
        print(f"\n{'='*50}")
        print(f"DEBUG - Available keys in student dict: {list(student.keys())}")
        print(f"Student: {student.get('first_name', 'N/A')} {student.get('last_name', 'N/A')}")
        print(f"Student ID: {student.get('student_id', 'N/A')}")
        print(f"Grade: {student.get('grade_level', 'N/A')}, Section: {student.get('section', 'N/A')}")
        print(f"Attendance: {student.get('attendance', student.get('attendance_percentage', 0))}%")
        print(f"Overall Average: {student.get('overall_average', student.get('average_score', 0))}")
        print(f"\nSubject Scores (Weighted):")
        subject_scores = student.get('subject_scores', {})
        if subject_scores:
            for subject, score in subject_scores.items():
                raw = student.get('raw_subject_scores', {}).get(subject, 0)
                total = student.get('subject_totals', {}).get(subject, 0)
                count = student.get('subject_counts', {}).get(subject, 0)
                print(f"  {subject}:")
                print(f"    - Count: {count}")
                print(f"    - Total: {total}")
                print(f"    - Raw Avg: {raw}")
                print(f"    - Weighted: {score}")
        else:
            print(f"  ⚠️  No subject scores found!")
    
    # Now let's check the raw database to see what's happening
    print("\n\n" + "="*70)
    print("RAW DATABASE CHECK")
    print("="*70)
    
    from Sub_app.models import Student, Score
    from sqlalchemy import func
    
    students = Student.query.all()
    for student in students:
        print(f"\n{student.first_name} {student.last_name} (student_id in Student table: '{student.student_id}')")
        
        # Check scores
        scores = Score.query.filter_by(student_id=student.student_id).all()
        print(f"  Scores found by student_id match: {len(scores)}")
        for score in scores:
            print(f"    - Score ID: {score.id}, student_id: '{score.student_id}', Subject: {score.subject}, Points: {score.points}")
        
        # Also check if there are any scores at all in the database
        all_scores = Score.query.all()
        print(f"\n  Total scores in database: {len(all_scores)}")
        if len(scores) == 0 and len(all_scores) > 0:
            print("  ⚠️  WARNING: No scores matched this student_id, but scores exist in database")
            print("  Available student_ids in Score table:")
            unique_ids = db.session.query(Score.student_id).distinct().all()
            for uid in unique_ids:
                print(f"    - '{uid[0]}'")
