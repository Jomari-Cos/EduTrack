"""
Database Migration Script for Teacher Formula Settings
This script adds score_weight and attendance_weight columns to the teachers table.
Run this script to update your existing database.
"""

import sqlite3
import os

def migrate_database():
    """Add formula settings columns to existing teachers table"""
    
    # Find the database file
    db_path = os.path.join(os.path.dirname(__file__), 'SmartC', 'instance', 'smartclassroom.db')
    
    if not os.path.exists(db_path):
        # Try alternative path
        db_path = os.path.join(os.path.dirname(__file__), 'instance', 'smartclassroom.db')
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at: {db_path}")
        print("Please ensure the database exists before running migration.")
        return False
    
    print(f"📂 Database found at: {db_path}")
    print("🔄 Starting database migration...")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(teachers)")
        columns = [col[1] for col in cursor.fetchall()]
        
        score_weight_exists = 'score_weight' in columns
        attendance_weight_exists = 'attendance_weight' in columns
        
        if score_weight_exists and attendance_weight_exists:
            print("✅ Columns already exist. No migration needed.")
            conn.close()
            return True
        
        # Add columns if they don't exist
        if not score_weight_exists:
            print("⚡ Adding score_weight column...")
            cursor.execute(
                "ALTER TABLE teachers ADD COLUMN score_weight REAL DEFAULT 0.7 NOT NULL"
            )
            print("✅ score_weight column added")
        
        if not attendance_weight_exists:
            print("⚡ Adding attendance_weight column...")
            cursor.execute(
                "ALTER TABLE teachers ADD COLUMN attendance_weight REAL DEFAULT 0.3 NOT NULL"
            )
            print("✅ attendance_weight column added")
        
        # Commit changes
        conn.commit()
        conn.close()
        
        print("\n✅ Migration completed successfully!")
        print("📊 All existing teachers now have default formula settings (70% scores, 30% attendance)")
        return True
        
    except Exception as e:
        print(f"❌ Error during migration: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Teacher Formula Settings Migration")
    print("=" * 60)
    print()
    
    success = migrate_database()
    
    print()
    print("=" * 60)
    if success:
        print("✅ Migration completed! You can now restart your Flask app.")
    else:
        print("❌ Migration failed. Please check the errors above.")
    print("=" * 60)
