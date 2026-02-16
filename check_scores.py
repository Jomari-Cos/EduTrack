import sqlite3
import os

db_paths = [
    r"C:\Users\user\EduTrack\instance\smartclassroom.db",
    r"C:\Users\user\EduTrack\SmartC\instance\smartclassroom.db"
]

for db_path in db_paths:
    if not os.path.exists(db_path):
        print(f"Skipping {db_path} - file not found")
        continue
        
    print("\n" + "=" * 70)
    print(f"CHECKING DATABASE: {db_path}")
    print("=" * 70)
    
    conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 50)
print("CHECKING DATABASE TABLES")
print("=" * 50)

# First, check what tables exist
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("\nTables in database:")
for table in tables:
    print(f"  - {table[0]}")

print("\n" + "=" * 50)
print("CHECKING BUSINESS MATH SCORES")
print("=" * 50)

# Check all Business Math scores - trying both 'score' and 'scores' table names
table_name = None
for t in tables:
    if 'score' in t[0].lower():
        table_name = t[0]
        break

if not table_name:
    print("ERROR: No score table found!")
    exit(1)

print(f"\nUsing table: {table_name}")
cursor.execute(f"SELECT student_id, subject, points, date FROM {table_name} WHERE subject LIKE '%Business%' OR subject LIKE '%Math%'")
rows = cursor.fetchall()
print(f"\nFound {len(rows)} scores with 'Business' or 'Math' in subject:")
for row in rows:
    print(f"  Student ID: {row[0]}, Subject: '{row[1]}', Points: {row[2]}, Date: {row[3]}")

# Check distinct subjects in score table
print("\n" + "=" * 50)
print("ALL DISTINCT SUBJECTS IN SCORE TABLE:")
print("=" * 50)
cursor.execute("SELECT DISTINCT subject FROM score")
subjects = cursor.fetchall()
for subj in subjects:
    print(f"  - '{subj[0]}'")

# Check specific student mentioned in the issue
print("\n" + "=" * 50)
print("CHECKING SPECIFIC STUDENT (if you know the ID):")
print("=" * 50)
# Let's just show the last few students with scores
cursor.execute("""
    SELECT s.student_id, s.first_name, s.last_name, sc.subject, 
           COUNT(sc.points) as score_count, 
           SUM(sc.points) as total_points,
           AVG(sc.points) as avg_points
    FROM student s
    LEFT JOIN score sc ON s.student_id = sc.student_id
    WHERE sc.subject IS NOT NULL
    GROUP BY s.student_id, sc.subject
    ORDER BY s.student_id DESC
    LIMIT 10
""")
student_scores = cursor.fetchall()
print("\nRecent students with scores:")
for row in student_scores:
    print(f"  {row[0]} - {row[1]} {row[2]}: Subject '{row[3]}' - Count: {row[4]}, Total: {row[5]}, Avg: {row[6]:.2f}")

    conn.close()
    print("\n")  # Add spacing between databases
