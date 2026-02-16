import sqlite3

db_path = r"C:\Users\user\EduTrack\instance\smartclassroom.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 70)
print("TEACHERS TABLE SCHEMA")
print("=" * 70)

# Get table structure
cursor.execute("PRAGMA table_info(teachers)")
columns = cursor.fetchall()

print("\nColumn Details:")
print(f"{'Column Name':<25} {'Type':<15} {'Default':<15}")
print("-" * 70)
for col in columns:
    col_id, name, type_, notnull, default, pk = col
    print(f"{name:<25} {type_:<15} {str(default):<15}")

print("\n" + "=" * 70)
print("CURRENT TEACHER DATA")
print("=" * 70)

# Get all teachers with their weights
cursor.execute("""
    SELECT 
        teacher_id,
        name,
        score_weight,
        attendance_weight,
        (score_weight + attendance_weight) as total
    FROM teachers
""")

teachers = cursor.fetchall()

print(f"\n{'Teacher ID':<15} {'Name':<20} {'Score Weight':<15} {'Attendance':<15} {'Total':<10}")
print("-" * 80)
for t in teachers:
    tid, name, score_w, attend_w, total = t
    print(f"{tid:<15} {name:<20} {score_w:<15} {attend_w:<15} {total:<10}")
    print(f"{'':15} {'':20} {f'({score_w*100}%)':<15} {f'({attend_w*100}%)':<15}")

print("\n" + "=" * 70)
print("VALUE FORMAT EXPLANATION")
print("=" * 70)
print("\n📊 Database stores as DECIMAL (0.0 to 1.0):")
print("   - 0.7 = 70%")
print("   - 0.3 = 30%")
print("   - 1.0 = 100%")
print("\n✅ Column Type: REAL (floating point number)")
print("✅ Valid Range: 0.0 to 1.0")
print("✅ Must Sum To: 1.0 (100%)")

conn.close()
