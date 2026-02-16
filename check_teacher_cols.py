import sqlite3

db_path = r"C:\Users\user\EduTrack\SmartC\instance\smartclassroom.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 50)
print("CHECKING TEACHER TABLE COLUMNS")
print("=" * 50)

cursor.execute("PRAGMA table_info(teachers)")
columns = cursor.fetchall()
print("\nColumns in teachers table:")
for col in columns:
    print(f"  {col[1]} ({col[2]})")

# Check if score_weight and attendance_weight exist
has_score_weight = any(col[1] == 'score_weight' for col in columns)
has_attendance_weight = any(col[1] == 'attendance_weight' for col in columns)

print(f"\n✅ score_weight column exists: {has_score_weight}")
print(f"✅ attendance_weight column exists: {has_attendance_weight}")

if has_score_weight and has_attendance_weight:
    cursor.execute("SELECT name, score_weight, attendance_weight FROM teachers")
    teachers = cursor.fetchall()
    print("\nTeacher formula settings:")
    for t in teachers:
        print(f"  {t[0]}: score_weight={t[1]}, attendance_weight={t[2]}")

conn.close()
