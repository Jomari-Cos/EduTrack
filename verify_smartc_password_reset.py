"""
Quick verification that SmartC has password reset feature
"""

import os

def verify_smartc_password_reset():
    """Verify all password reset files exist in SmartC"""
    
    print("=" * 60)
    print("🔍 VERIFYING SMARTC PASSWORD RESET IMPLEMENTATION")
    print("=" * 60)
    print()
    
    files_to_check = [
        ('SmartC/email_config.py', 'Email configuration'),
        ('SmartC/templates/mainH.html', 'Login page with modal'),
        ('SmartC/templates/reset_password.html', 'Password reset page'),
        ('SmartC/static/js/mainJS.js', 'JavaScript with reset logic'),
        ('SmartC/static/Css/mainCss.css', 'CSS with modal styles'),
    ]
    
    all_exist = True
    
    for filepath, description in files_to_check:
        if os.path.exists(filepath):
            print(f"✅ {filepath}")
        else:
            print(f"❌ {filepath} - MISSING!")
            all_exist = False
    
    print()
    
    # Check if mainH.html has the correct link
    print("Checking mainH.html for forgot password link...")
    with open('SmartC/templates/mainH.html', 'r', encoding='utf-8') as f:
        content = f.read()
        if '<a href="#" id="forgot-password"' in content:
            print("✅ Forgot password link is correct (<a> tag)")
        elif '<p href="#" id="forgot-password"' in content:
            print("❌ Forgot password link is wrong (<p> tag)")
            all_exist = False
        else:
            print("❌ Forgot password link not found")
            all_exist = False
    
    # Check if modal exists
    if 'id="forgotPasswordModal"' in content:
        print("✅ Forgot password modal exists")
    else:
        print("❌ Forgot password modal missing")
        all_exist = False
    
    print()
    
    # Check if main.py has the routes
    print("Checking SmartC/main.py for password reset routes...")
    with open('SmartC/main.py', 'r', encoding='utf-8') as f:
        content = f.read()
        routes = [
            '/request-password-reset',
            '/reset-password-rfid',
            '/reset-password/<token>',
            '/reset-password',
        ]
        for route in routes:
            if route in content:
                print(f"✅ Route: {route}")
            else:
                print(f"❌ Route: {route} - MISSING!")
                all_exist = False
    
    print()
    
    # Check if models.py has PasswordResetToken
    print("Checking SmartC/Sub_app/models.py for PasswordResetToken...")
    with open('SmartC/Sub_app/models.py', 'r', encoding='utf-8') as f:
        content = f.read()
        if 'class PasswordResetToken' in content:
            print("✅ PasswordResetToken model exists")
        else:
            print("❌ PasswordResetToken model missing")
            all_exist = False
    
    print()
    print("=" * 60)
    
    if all_exist:
        print("✅ ALL CHECKS PASSED!")
        print()
        print("🎉 Password reset is ready to use in SmartC!")
        print()
        print("📝 Next steps:")
        print("   1. Configure email in SmartC/email_config.py")
        print("   2. Run: python SmartC/main.py")
        print("   3. Click 'Forgot Password?' on login page")
        print("   4. Test both Email and RFID reset")
    else:
        print("❌ SOME CHECKS FAILED")
        print("Please review the errors above")
    
    print("=" * 60)

if __name__ == "__main__":
    verify_smartc_password_reset()
