# 🐛 Registration Debugging Guide

## Quick Checklist ✅

1. **Backend Status**: Django server running on http://localhost:8000
2. **Frontend Status**: React running on http://localhost:3000
3. **CORS**: Enabled for http://localhost:3000
4. **API Endpoint**: `POST http://localhost:8000/api/auth/register/`

---

## How to Debug Registration Issues

### Step 1: Check Browser Console
1. Open http://localhost:3000/register
2. Right-click → Inspect → Console tab
3. Try registering and look for console logs showing:
   - ✅ "📤 Sending registration data:" - confirms form data
   - ✅ "✅ Registration successful:" - confirms success
   - ❌ "❌ Error response:" - shows what API returned

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Try registering
3. Look for the request to `register/`
4. Click it and check:
   - **Request**: Verify JSON payload looks correct
   - **Response**: Status code and error messages

### Step 3: Test with Test HTML Page
1. Open: http://localhost:3000/test-register.html
2. This auto-tests the registration endpoint
3. Shows exact request/response

---

## Common Issues & Solutions

### ❌ Error: "All fields are required"
**Cause**: Empty form fields
**Solution**: Fill in all fields (username, email, password)

### ❌ Error: "This field may not be blank"
**Cause**: One of the fields is empty in the request
**Solution**: Ensure all form fields have values before clicking Register

### ❌ Error: "Enter a valid email address"
**Cause**: Email format is invalid
**Solution**: Use format like `user@example.com`

### ❌ Error: "Username already exists"
**Cause**: Username is already registered
**Solution**: Try a different username

### ❌ CORS Error
**Cause**: Frontend/Backend not in same origin
**Solution**: 
- Backend should have: `CORS_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']`
- Currently enabled ✅

### ❌ "Connection refused" or Network Error
**Cause**: Backend server not running
**Solution**: Start backend: `python manage.py runserver 0.0.0.0:8000`

### ❌ Error: "Registration failed. Please try again."
**Cause**: Unexpected error format from server
**Solution**: 
- Check browser console for full error object
- Check backend server logs
- Verify API endpoint is `/api/auth/register/`

---

## Testing with curl (Windows PowerShell)

```powershell
$body = @{
    username="testuser_123"
    email="test@example.com"
    password="securepass123"
    role="consumer"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/auth/register/" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body `
  -UseBasicParsing
```

---

## Backend Validation Rules

| Field | Requirements |
|-------|--------------|
| **username** | Required, 150 chars max, unique, alphanumeric |
| **email** | Required, valid email format, unique |
| **password** | Required, 8+ chars recommended |
| **role** | Optional, must be: `farmer`, `consumer`, or `admin` |

---

## What to Report

If registration still fails, provide:

1. **Screenshots** of error message
2. **Browser console output** (F12 → Console)
3. **Network tab request/response** (F12 → Network)
4. **Backend logs** from terminal running Django
5. **Steps to reproduce** exactly

---

## Quick Test

**Try this exact registration:**
- Username: `farmer_123`
- Email: `farmer@test.com`  
- Password: `testpass123`
- Role: `Farmer`

If this works, the issue is with specific input data.
If this fails, the issue is with the API connection.
