"""
Database Migration Script for Password Reset Token Table
Run this script to add the password_reset_tokens table to your database
"""

import sys
import os

# Add the parent directory to the path so we can import from the app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def create_password_reset_table():
    """Create the password_reset_tokens table"""
    try:
        from main import app, db
        from Sub_app.models import PasswordResetToken
        
        with app.app_context():
            # Create the table
            db.create_all()
            print("✅ Password reset tokens table created successfully!")
            print("📋 Table: password_reset_tokens")
            print("   Columns: id, teacher_id, token, created_at, expires_at, used")
            
    except ImportError as e:
        print(f"❌ Import error: {str(e)}")
        print("💡 Make sure you're running this from the EduTrack directory")
        print("💡 And that your virtual environment is activated")
    except Exception as e:
        print(f"❌ Error creating table: {str(e)}")

if __name__ == "__main__":
    create_password_reset_table()
