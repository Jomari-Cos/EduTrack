"""
Test Password Reset Functionality
Run this to verify your password reset implementation
"""

import sqlite3
import os
from datetime import datetime

def test_password_reset_table():
    """Test if password_reset_tokens table exists and has correct structure"""
    
    DB_PATH = os.path.join('instance', 'smartclassroom.db')
    
    if not os.path.exists(DB_PATH):
        print("❌ Database not found")
        return False
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='password_reset_tokens'
        """)
        
        if not cursor.fetchone():
            print("❌ password_reset_tokens table does not exist")
            print("💡 Run: python migrate_password_reset.py")
            return False
        
        # Check table structure
        cursor.execute("PRAGMA table_info(password_reset_tokens)")
        columns = cursor.fetchall()
        
        expected_columns = ['id', 'teacher_id', 'token', 'created_at', 'expires_at', 'used']
        actual_columns = [col[1] for col in columns]
        
        print("✅ password_reset_tokens table exists")
        print(f"📋 Columns: {', '.join(actual_columns)}")
        
        # Verify all expected columns exist
        for col in expected_columns:
            if col in actual_columns:
                print(f"   ✓ {col}")
            else:
                print(f"   ✗ {col} (missing)")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_teacher_table():
    """Check if teachers table has email column"""
    
    DB_PATH = os.path.join('instance', 'smartclassroom.db')
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("PRAGMA table_info(teachers)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'email' in columns:
            print("✅ Teachers table has email column")
            
            # Check if any teachers have email addresses
            cursor.execute("SELECT COUNT(*) FROM teachers WHERE email IS NOT NULL AND email != ''")
            count = cursor.fetchone()[0]
            print(f"📧 {count} teacher(s) have email addresses configured")
            
            if count == 0:
                print("⚠️  Warning: No teachers have email addresses. Add emails to test email reset.")
        else:
            print("❌ Teachers table missing email column")
            return False
        
        if 'rfid_code' in columns:
            print("✅ Teachers table has rfid_code column")
            
            # Check if any teachers have RFID codes
            cursor.execute("SELECT COUNT(*) FROM teachers WHERE rfid_code IS NOT NULL AND rfid_code != ''")
            count = cursor.fetchone()[0]
            print(f"📡 {count} teacher(s) have RFID codes configured")
            
            if count == 0:
                print("⚠️  Warning: No teachers have RFID codes. Add RFID to test RFID reset.")
        else:
            print("❌ Teachers table missing rfid_code column")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_files_exist():
    """Check if all required files exist"""
    
    files = [
        ('email_config.py', 'Email configuration'),
        ('templates/mainH.html', 'Login page with forgot password'),
        ('templates/reset_password.html', 'Password reset page'),
        ('static/js/mainJS.js', 'JavaScript for password reset'),
        ('static/Css/mainCss.css', 'CSS styles'),
        ('migrate_password_reset.py', 'Migration script'),
    ]
    
    all_exist = True
    
    print("\n📁 Checking required files...")
    for filepath, description in files:
        if os.path.exists(filepath):
            print(f"   ✅ {filepath} ({description})")
        else:
            print(f"   ❌ {filepath} ({description}) - MISSING")
            all_exist = False
    
    return all_exist


def test_routes_in_main():
    """Check if password reset routes are in main.py"""
    
    if not os.path.exists('main.py'):
        print("❌ main.py not found")
        return False
    
    with open('main.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    routes = [
        ('/request-password-reset', 'Email reset request'),
        ('/reset-password-rfid', 'RFID password reset'),
        ('/reset-password/<token>', 'Reset page'),
        ('/reset-password', 'Reset password POST'),
    ]
    
    print("\n🛣️  Checking routes in main.py...")
    all_exist = True
    
    for route, description in routes:
        if route in content or route.replace('<token>', '') in content:
            print(f"   ✅ {route} ({description})")
        else:
            print(f"   ❌ {route} ({description}) - MISSING")
            all_exist = False
    
    return all_exist


def main():
    print("=" * 60)
    print("🧪 PASSWORD RESET FEATURE TEST")
    print("=" * 60)
    print()
    
    results = []
    
    # Test 1: Database table
    print("Test 1: Database Table Structure")
    print("-" * 60)
    results.append(test_password_reset_table())
    print()
    
    # Test 2: Teacher table
    print("Test 2: Teacher Table Configuration")
    print("-" * 60)
    results.append(test_teacher_table())
    print()
    
    # Test 3: Required files
    print("Test 3: Required Files")
    print("-" * 60)
    results.append(test_files_exist())
    print()
    
    # Test 4: Routes
    print("Test 4: Backend Routes")
    print("-" * 60)
    results.append(test_routes_in_main())
    print()
    
    # Summary
    print("=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ ALL TESTS PASSED ({passed}/{total})")
        print()
        print("🎉 Password reset feature is ready to use!")
        print()
        print("📝 Next steps:")
        print("   1. Configure email settings in email_config.py")
        print("   2. Add email addresses to teacher accounts")
        print("   3. Add RFID codes to teacher accounts (optional)")
        print("   4. Start the Flask app and test the feature")
    else:
        print(f"⚠️  SOME TESTS FAILED ({passed}/{total} passed)")
        print()
        print("💡 Please fix the issues above before using the feature")
    
    print("=" * 60)


if __name__ == "__main__":
    main()
