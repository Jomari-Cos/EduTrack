# Password Reset Feature - Setup Guide

## 🔧 Installation Steps

### 1. Run Database Migration
Create the password_reset_tokens table in your database:

```bash
python create_password_reset_table.py
```

### 2. Configure Email Settings

#### Option A: Using Environment Variables (Recommended for Production)
Set these environment variables in your system or .env file:

```bash
# Windows PowerShell
$env:EMAIL_HOST = "smtp.gmail.com"
$env:EMAIL_PORT = "587"
$env:EMAIL_USERNAME = "your-email@gmail.com"
$env:EMAIL_PASSWORD = "your-app-password"
$env:EMAIL_FROM_NAME = "EduTrack System"
```

```bash
# Linux/Mac
export EMAIL_HOST="smtp.gmail.com"
export EMAIL_PORT="587"
export EMAIL_USERNAME="your-email@gmail.com"
export EMAIL_PASSWORD="your-app-password"
export EMAIL_FROM_NAME="EduTrack System"
```

#### Option B: Direct Configuration (For Testing)
Edit `email_config.py` and update these lines:

```python
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USERNAME = 'your-email@gmail.com'
EMAIL_PASSWORD = 'your-app-password'
EMAIL_FROM_NAME = 'EduTrack System'
```

### 3. Gmail App Password Setup

For Gmail users, you need to create an App Password:

1. **Enable 2-Factor Authentication**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Windows Computer" (or Other)
   - Click "Generate"
   - Copy the 16-character password (remove spaces)
   - Use this as your EMAIL_PASSWORD

3. **Important**: Use the App Password, NOT your regular Gmail password!

### 4. Test Email Configuration

Run this test script to verify your email setup:

```python
from email_config import send_password_reset_email

# Test email
success, message = send_password_reset_email(
    recipient_email="test@example.com",
    teacher_name="Test Teacher",
    reset_link="http://localhost:5000/reset-password/test-token",
    teacher_id="T001"
)

if success:
    print("✅ Email configuration working!")
else:
    print(f"❌ Email error: {message}")
```

---

## 📧 Email Provider Configuration

### Gmail
```python
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
```

### Outlook/Hotmail
```python
EMAIL_HOST = 'smtp-mail.outlook.com'
EMAIL_PORT = 587
```

### Office 365
```python
EMAIL_HOST = 'smtp.office365.com'
EMAIL_PORT = 587
```

### Yahoo Mail
```python
EMAIL_HOST = 'smtp.mail.yahoo.com'
EMAIL_PORT = 587
```

---

## 🚀 Usage

### Email-Based Password Reset
1. User clicks "Forgot Password?" on login page
2. User selects "Email Reset" tab
3. User enters their Teacher ID or email
4. System sends email with reset link (valid for 60 minutes)
5. User clicks link in email
6. User enters new password
7. User logs in with new password

### RFID-Based Password Reset
1. User clicks "Forgot Password?" on login page
2. User selects "RFID Reset" tab
3. User scans their RFID card
4. System verifies RFID card
5. User enters new password
6. Password is reset immediately

---

## 🔒 Security Features

✅ **Token Expiration**: Reset links expire after 60 minutes
✅ **One-Time Use**: Each reset token can only be used once
✅ **Secure Tokens**: Uses cryptographically secure random tokens
✅ **No User Enumeration**: Same message for valid/invalid accounts
✅ **Password Strength**: Minimum 6 characters required
✅ **HTTPS Recommended**: Use HTTPS in production
✅ **Email Notifications**: Users notified when password changes

---

## 🛠️ Troubleshooting

### "Email authentication failed"
- Check if you're using an App Password (not regular password)
- Verify 2-Factor Authentication is enabled
- Check if "Less secure app access" is ON (for some providers)

### "SMTP connection error"
- Verify EMAIL_HOST and EMAIL_PORT are correct
- Check firewall settings
- Try port 465 with SSL instead of 587 with TLS

### "Invalid RFID card"
- Ensure teacher has an RFID card registered in the system
- Check that RFID scanner is working properly
- Verify RFID code is stored correctly in database

### "Reset link expired"
- Links expire after 60 minutes
- User must request a new reset link
- Check server time is correct

---

## 📝 Database Schema

The `password_reset_tokens` table structure:

```sql
CREATE TABLE password_reset_tokens (
    id INTEGER PRIMARY KEY,
    teacher_id VARCHAR(50) FOREIGN KEY,
    token VARCHAR(100) UNIQUE,
    created_at DATETIME,
    expires_at DATETIME,
    used BOOLEAN DEFAULT FALSE
)
```

---

## 🔗 API Endpoints

### Request Password Reset (Email)
```
POST /request-password-reset
Body: { "identifier": "T001" or "email@example.com" }
```

### Reset Password (Email Token)
```
POST /reset-password
Body: { 
    "token": "abc123...", 
    "new_password": "newpass", 
    "confirm_password": "newpass" 
}
```

### Reset Password (RFID)
```
POST /reset-password-rfid
Body: { 
    "rfid_code": "RFID123", 
    "new_password": "newpass", 
    "confirm_password": "newpass" 
}
```

### Password Reset Page
```
GET /reset-password/<token>
```

---

## 📧 Email Template Customization

To customize the email templates, edit the HTML content in `email_config.py`:

- `send_password_reset_email()` - Reset link email
- `send_password_change_notification()` - Confirmation email

---

## ⚠️ Production Recommendations

1. **Use Environment Variables**: Never hardcode credentials
2. **Enable HTTPS**: Use SSL/TLS certificates
3. **Set Strong Passwords**: Enforce password complexity rules
4. **Rate Limiting**: Limit reset requests (max 3 per 15 minutes)
5. **Logging**: Log all password reset attempts
6. **Monitoring**: Monitor for suspicious activity
7. **Backup**: Regular database backups

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review email provider documentation
3. Check server logs for error messages
4. Verify database migrations ran successfully

---

## ✨ Features Implemented

✅ Email-based password reset with secure tokens
✅ RFID-based instant password reset
✅ Beautiful email templates with school branding
✅ Responsive modal design
✅ Password strength indicator
✅ Real-time validation
✅ Token expiration (60 minutes)
✅ One-time use tokens
✅ Email notifications
✅ Security best practices
✅ User-friendly error messages
✅ Loading states and animations

---

**Version**: 1.0.0  
**Last Updated**: February 22, 2026  
**Compatibility**: EduTrack System
