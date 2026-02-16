import sys
sys.path.insert(0, 'SmartC')

from Sub_app.models import db, SystemSettings, get_student_analytics, evaluate_student_status
from main import app

app.app_context().push()

print("="*60)
print("CHECKING BADGE SYSTEM")
print("="*60)

# Check thresholds
settings = SystemSettings.query.first()
if settings:
    print(f"\n✓ SystemSettings found:")
    print(f"  • Min Attendance: {settings.minimum_attendance_percentage}%")
    print(f"  • Passing Grade: {settings.passing_grade}%")
    print(f"  • Honor Roll: {settings.honor_roll_grade}%")
else:
    print("\n✗ NO SystemSettings found!")

# Check student data
print(f"\n--- Student Analytics ---")
analytics = get_student_analytics()
print(f"Total students: {len(analytics)}")

if analytics:
    print("\nFirst 5 students:")
    for s in analytics[:5]:
        print(f"  {s['student_id']}: Attendance={s['attendance']}%, Score={s['average_score']}%")
    
    # Check evaluations
    print(f"\n--- Status Evaluations ---")
    evaluations = evaluate_student_status()
    print(f"Total evaluations: {len(evaluations)}")
    
    if evaluations:
        print("\nFirst 5 student evaluations:")
        for eval_data in evaluations[:5]:
            student = eval_data['student']
            flags = eval_data['flags']
            print(f"\n  {student['student_id']} - {student['first_name']} {student['last_name']}")
            print(f"    Attendance: {student['attendance']}%")
            print(f"    Score: {student['average_score']}%")
            if flags:
                print(f"    Flags: {len(flags)}")
                for flag in flags:
                    print(f"      - {flag['icon']} {flag['type']}: {flag['message']}")
            else:
                print(f"    Flags: NONE (student is in good standing)")
    else:
        print("\n✗ NO evaluations generated!")
else:
    print("\n✗ NO student data found!")

print("\n" + "="*60)
