import sqlite3

db_path = r"C:\Users\user\EduTrack\instance\smartclassroom.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 70)
print(f"CHECKING MAIN DATABASE: {db_path}")
print("=" * 70)

# Check tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print(f"\nTables: {[t[0] for t in tables]}")

# Check students with scores
cursor.execute("""
    SELECT s.student_id, s.first_name, s.last_name, 
           COUNT(sc.id) as score_count, 
           SUM(sc.points) as total_points,
           AVG(sc.points) as avg_points
    FROM student s
    LEFT JOIN score sc ON s.student_id = sc.student_id
    GROUP BY s.student_id
""")
students = cursor.fetchall()

print(f"\nStudents ({len(students)} total):")
for student in students:
    sid, fname, lname, count, total, avg = student
    if count > 0:
        print(f"  ✅ {fname} {lname} (ID: {sid}): {count} scores, Total: {total}, Avg: {avg:.2f}")
    else:
        print(f"  ⚠️  {fname} {lname} (ID: {sid}): No scores")

# Check teacher settings
cursor.execute("SELECT name, score_weight, attendance_weight FROM teachers")
teachers = cursor.fetchall()
print(f"\nTeachers with formula settings:")
for t in teachers:
    print(f"  {t[0]}: Score Weight={t[1]}, Attendance Weight={t[2]}")

conn.close()
print("\n✅ Database check complete!")
