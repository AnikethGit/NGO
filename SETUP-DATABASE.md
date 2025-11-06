# 🔒 Secure Database Setup Guide
**Sri Dutta Sai Manga Bharadwaja Trust - Production Environment**

## ✅ What We've Set Up

You now have a **secure, production-ready authentication system** that:
- ✅ Uses your existing `.env` file for database credentials
- ✅ Stores real user registrations in MySQL database
- ✅ Includes proper password hashing and security
- ✅ Has rate limiting and account lockout protection
- ✅ Falls back to demo mode if database is unavailable

## 🚀 Quick Setup (3 Steps)

### **Step 1: Update Your Database Credentials**

Edit your `.env` file and fill in the empty database fields:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name        # ← Fill this
DB_USER=your_database_username    # ← Fill this  
DB_PASS=your_database_password    # ← Fill this
DB_CHARSET=utf8mb4
DB_COLLATION=utf8mb4_unicode_ci
```

**For Hostinger:** 
- Get these from hPanel → Databases → MySQL Databases
- Or create a new database if you don't have one

### **Step 2: Replace Your Auth System**

**Option A: Replace existing file**
```bash
# Backup current file
mv api/auth.php api/auth-backup.php

# Use the new production version
mv api/auth-production.php api/auth.php
```

**Option B: Keep both (recommended for testing)**
- Keep `api/auth.php` for current functionality
- Use `api/auth-production.php` for new registrations
- Update your login.html to point to `api/auth-production.php`

### **Step 3: Secure Your Files**

Add the security rules from `.htaccess-security` to your main `.htaccess` file:

```apache
# Protect .env file
<Files ".env">
    Order allow,deny
    Deny from all
</Files>

<Files ".env.*">
    Order allow,deny
    Deny from all
</Files>

# Add other rules from .htaccess-security as needed
```

## 🎯 Testing Your Setup

### **1. Test Database Connection**
Visit: `https://yoursite.com/api/auth-production.php?action=csrf_token`

**Expected Response:**
```json
{
  "success": true,
  "csrf_token": "abc123...",
  "expires_in": 3600
}
```

### **2. Test User Registration**
Try registering a new user through your registration form.

**Success indicators:**
- Registration shows "successful" message
- New user appears in your database `users` table
- Password is properly hashed (not plain text)

### **3. Test Login**
Try logging in with the newly registered user.

**Default admin accounts created:**
- **Email:** Your `ADMIN_EMAIL` from .env (default: admin@sadgurubharadwaja.org)
- **Password:** admin123

## 🔧 Configuration Options

All settings are controlled by your `.env` file:

```bash
# Security Settings
PASSWORD_MIN_LENGTH=6
NAME_MIN_LENGTH=2
LOGIN_RATE_LIMIT=5
LOGIN_LOCKOUT_MINUTES=30
SESSION_LIFETIME=7200

# Feature Flags  
VOLUNTEER_REGISTRATION_ENABLED=true
EMAIL_VERIFICATION_ENABLED=false
EMAIL_VERIFICATION_REQUIRED=false

# Admin URLs
ADMIN_URL=https://sadgurubharadwaja.org/admin-dashboard.html
USER_DASHBOARD_URL=https://sadgurubharadwaja.org/dashboard.html
```

## 🏗️ Database Schema

The system automatically creates this `users` table:

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('user', 'volunteer', 'admin') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    newsletter_subscribed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    login_attempts INT DEFAULT 0,
    lockout_until TIMESTAMP NULL
);
```

## ⚡ Advanced Features

### **User Statistics (Admin Only)**
Get user stats: `GET /api/auth-production.php?action=user_stats`

### **Session Management**
Check session: `GET /api/auth-production.php?action=check_session`

### **Enhanced Security**
- ✅ Password hashing with `password_hash()`
- ✅ CSRF token protection
- ✅ Rate limiting on failed login attempts
- ✅ Account lockout protection
- ✅ Session timeout management
- ✅ SQL injection prevention
- ✅ Input sanitization

### **Environment-Based Configuration**
- ✅ Different settings for development/production
- ✅ Secure credential management
- ✅ Configurable security policies
- ✅ Automatic fallback to demo mode

## 🚨 Important Security Notes

1. **Never commit your `.env` file** - it's already in `.gitignore`
2. **Use strong database passwords** - especially in production
3. **Enable HTTPS** - required for secure session cookies
4. **Regular backups** - backup your database regularly
5. **Monitor logs** - check server logs for security issues

## 🛠️ Troubleshooting

### **"Database connection failed"**
- ✅ Check DB_* values in `.env` are correct
- ✅ Ensure database exists and user has proper permissions
- ✅ Test connection from command line: `mysql -h HOST -u USER -p DATABASE`

### **"Registration successful but user not in database"**
- ✅ Check if you're still using old `auth.php` instead of `auth-production.php`
- ✅ Check server error logs for PHP errors
- ✅ Verify database table was created properly

### **"CSRF token errors"**
- ✅ Clear browser cache and cookies
- ✅ Check session configuration in `.env`
- ✅ Ensure cookies are enabled

### **Demo Mode Active**
If you see `"demo_mode": true` in responses:
- Database connection failed - check your `.env` credentials
- Look in server error logs for specific database errors

## 📞 Support

If you encounter issues:
1. **Check server error logs** first
2. **Test API endpoints** directly in browser
3. **Verify `.env` configuration** 
4. **Check database permissions**

---

**🎉 You now have a production-ready, secure authentication system!**

Your user registrations will be properly stored in the database with hashed passwords, rate limiting, and all the security features needed for a professional NGO website.