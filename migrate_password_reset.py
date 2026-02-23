"""
Simple Database Migration - Add Password Reset Token Table
This creates the table directly using SQLAlchemy without importing the full app
"""

import sqlite3
import os

# Path to your database
DB_PATH = os.path.join('instance', 'smartclassroom.db')

def create_password_reset_table():
    """Create the password_reset_tokens table directly in SQLite"""
    
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at: {DB_PATH}")
        print("💡 Make sure you're running this from the EduTrack directory")
        return
    
    try:
        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create password_reset_tokens table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id VARCHAR(50) NOT NULL,
                token VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT 0,
                FOREIGN KEY (teacher_id) REFERENCES teachers (teacher_id)
            )
        ''')
        
        # Create index for faster lookups
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_reset_token 
            ON password_reset_tokens(token)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_reset_teacher 
            ON password_reset_tokens(teacher_id)
        ''')
        
        conn.commit()
        conn.close()
        
        print("✅ Password reset tokens table created successfully!")
        print("📋 Table: password_reset_tokens")
        print("   Columns:")
        print("   - id (INTEGER PRIMARY KEY)")
        print("   - teacher_id (VARCHAR(50))")
        print("   - token (VARCHAR(100) UNIQUE)")
        print("   - created_at (TIMESTAMP)")
        print("   - expires_at (TIMESTAMP)")
        print("   - used (BOOLEAN)")
        print("\n✅ Indexes created for better performance")
        
    except sqlite3.Error as e:
        print(f"❌ SQLite error: {str(e)}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    create_password_reset_table()
