# 🔐 Password Reset Feature - Quick Start Guide

## ✅ Implementation Complete!

Both **Email-based** and **RFID-based** password reset features have been successfully implemented.

---

## 🚀 Quick Start (3 Steps)

### 1. Configure Email (Required for Email Reset)

Edit `email_config.py` or set environment variables:

```python
# For Gmail
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USERNAME = 'your-school-email@gmail.com'
EMAIL_PASSWORD = 'your-16-char-app-password'  # Not your regular password!
```

**🔑 Get Gmail App Password:**
1. Enable 2-Factor Authentication at https://myaccount.google.com/security
2. Create App Password at https://myaccount.google.com/apppasswords
3. Use the 16-character password (remove spaces)

### 2. Ensure Teachers Have Email Addresses

Check your teachers in the admin panel - they need email addresses for email-based reset.

For RFID reset, teachers need their RFID codes registered.

### 3. Test It!

Run your Flask app and click "Forgot Password?" on the login page.

---

## 📱 How Users Reset Their Password

### Method 1: Email Reset
1. Click **"Forgot Password?"** on login page
2. Select **"Email Reset"** tab
3. Enter Teacher ID or email address
4. Check email for reset link (valid 60 minutes)
5. Click link and set new password
6. Log in with new password

### Method 2: RFID Reset  
1. Click **"Forgot Password?"** on login page
2. Select **"RFID Reset"** tab
3. Scan RFID card
4. Enter new password
5. Done! Log in immediately

---

## 🎨 Features Implemented

✅ **Beautiful Modal Interface**
  - Tab-based design for Email/RFID reset
  - Responsive design (mobile-friendly)
  - Material Design icons
  - Smooth animations

✅ **Email Reset System**
  - Secure token generation
  - 60-minute expiration
  - One-time use tokens
  - Professional email templates
  - Confirmation emails

✅ **RFID Reset System**
  - Instant verification
  - No email required
  - Physical security token
  - Real-time scanning feedback

✅ **Security Features**
  - Hashed passwords
  - Secure random tokens
  - Token expiration
  - No user enumeration
  - Rate limiting ready
  - HTTPS recommended

✅ **User Experience**
  - Password strength indicator
  - Real-time validation
  - Clear error messages
  - Loading states
  - Success animations
  - Auto-redirect after success

---

## 📁 Files Created/Modified

### New Files:
- `email_config.py` - Email configuration
- `templates/reset_password.html` - Reset password page
- `migrate_password_reset.py` - Database migration
- `test_password_reset.py` - Feature tests
- `PASSWORD_RESET_SETUP.md` - Detailed guide

### Modified Files:
- `templates/mainH.html` - Added modal and "Forgot Password" link
- `static/Css/mainCss.css` - Added modal styles
- `static/js/mainJS.js` - Added reset functionality
- `main.py` - Added password reset routes
- `Sub_app/models.py` - Added PasswordResetToken model

---

## 🧪 Testing

Run the test suite:
```bash
python test_password_reset.py
```

All tests passed! ✅

---

## 🔧 Troubleshooting

### Email Not Sending?
- Check `EMAIL_USERNAME` and `EMAIL_PASSWORD` in `email_config.py`
- Use App Password, not regular Gmail password
- Enable 2-Factor Authentication first
- Check firewall/antivirus settings

### RFID Not Working?
- Ensure teacher has RFID code in database
- Test RFID scanner separately
- Check RFID code format matches

### Token Expired?
- Links expire after 60 minutes
- Request a new reset link
- Check server time is correct

---

## 📧 Email Providers Supported

- ✅ Gmail (smtp.gmail.com:587)
- ✅ Outlook (smtp-mail.outlook.com:587)
- ✅ Office 365 (smtp.office365.com:587)
- ✅ Yahoo (smtp.mail.yahoo.com:587)
- ✅ Other SMTP servers

---

## 🔒 Security Best Practices

1. **Use HTTPS** in production (required!)
2. **Environment Variables** for email credentials
3. **Strong Passwords** - enforce minimum 6 characters
4. **Rate Limiting** - limit reset requests
5. **Logging** - log all reset attempts
6. **Email Verification** - verify teacher emails
7. **RFID Security** - secure RFID card storage

---

## 📊 Database Schema

New table: `password_reset_tokens`

| Column      | Type         | Description                |
|-------------|--------------|----------------------------|
| id          | INTEGER      | Primary key                |
| teacher_id  | VARCHAR(50)  | Foreign key to teachers    |
| token       | VARCHAR(100) | Unique reset token         |
| created_at  | TIMESTAMP    | Token creation time        |
| expires_at  | TIMESTAMP    | Token expiration time      |
| used        | BOOLEAN      | Whether token was used     |

---

## 🎯 Next Steps

1. **Configure email** in `email_config.py`
2. **Add teacher emails** via admin panel
3. **Test email reset** with a real teacher account
4. **Add RFID codes** for RFID reset (optional)
5. **Deploy to production** with HTTPS

---

## 💡 Tips

- **Email Template**: Customize in `email_config.py` 
- **Token Expiry**: Change from 60 minutes in route handler
- **Password Requirements**: Adjust in validation logic
- **Styling**: Customize colors in `mainCss.css`

---

## 📞 Support

If you encounter issues:
1. Run `python test_password_reset.py`
2. Check console logs in browser (F12)
3. Check Flask terminal output
4. Review `PASSWORD_RESET_SETUP.md` for details

---

## ✨ Success!

Your EduTrack system now has a complete, secure, and user-friendly password reset feature with both email and RFID options!

**Last Updated**: February 22, 2026
**Status**: ✅ Ready for Production
