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
    if not tables:
        print("  (No tables found)")
        conn.close()
        continue
        
    for table in tables:
        print(f"  - {table[0]}")

    print("\n" + "=" * 50)
    print("CHECKING FOR SCORE TABLE")
    print("=" * 50)

    # Check all Business Math scores - trying both 'score' and 'scores' table names
    table_name = None
    for t in tables:
        if 'score' in t[0].lower():
            table_name = t[0]
            break

    if not table_name:
        print("ERROR: No score table found!")
        conn.close()
        continue

    print(f"\nUsing table: {table_name}")
    
    # Get all score records
    cursor.execute(f"SELECT student_id, subject, points, date FROM {table_name} LIMIT 20")
    all_scores = cursor.fetchall()
    print(f"\nAll scores in table (first 20):")
    for row in all_scores:
        print(f"  Student ID: {row[0]}, Subject: '{row[1]}', Points: {row[2]}")
    
    # Check distinct subjects in score table
    print("\n" + "=" * 50)
    print("ALL DISTINCT SUBJECTS:")
    print("=" * 50)
    cursor.execute(f"SELECT DISTINCT subject FROM {table_name}")
    subjects = cursor.fetchall()
    for subj in subjects:
        print(f"  - '{subj[0]}'")

    conn.close()
