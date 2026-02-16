import sqlite3

db_path = r"C:\Users\user\EduTrack\SmartC\instance\smartclassroom.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 50)
print("STUDENTS AND THEIR SCORES")
print("=" * 50)

# Get all students
cursor.execute("SELECT student_id, first_name, last_name, grade_level, section FROM student")
students = cursor.fetchall()

print(f"\nFound {len(students)} students:\n")

for student in students:
    student_id, fname, lname, grade, section = student
    print(f"\n{'='*50}")
    print(f"Student: {fname} {lname} (ID: {student_id})")
    print(f"Grade: {grade}, Section: {section}")
    print(f"{'='*50}")
    
    # Get scores for this student
    cursor.execute("""
        SELECT subject, COUNT(*) as count, SUM(points) as total, AVG(points) as average
        FROM score 
        WHERE student_id = ?
        GROUP BY subject
    """, (student_id,))
    scores = cursor.fetchall()
    
    if scores:
        for score_row in scores:
            subject, count, total, average = score_row
            print(f"  {subject}:")
            print(f"    Count: {count}")
            print(f"    Total: {total}")
            print(f"    Average: {average:.2f}")
    else:
        print(f"  ❌ No scores found for student_id '{student_id}'")
        
        # Check if there are scores with similar IDs
        cursor.execute("SELECT DISTINCT student_id FROM score WHERE student_id LIKE ?", (f"%{student_id[-4:]}%",))
        similar = cursor.fetchall()
        if similar:
            print(f"  ⚠️  But found similar IDs in score table: {[s[0] for s in similar]}")

conn.close()
