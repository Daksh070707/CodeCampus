# Recruiter Jobs & Pipeline - Complete Diagnostic & Setup Guide

## Current Status
✅ Frontend UI components fully implemented with error states
✅ Backend API endpoints defined
✅ Error handling and retry mechanism added
✅ Console logging enabled for debugging

## What to Do If Pages Still Don't Load Data

### Step 1: Verify Backend is Running
```powershell
# Check if backend is running on port 5000
netstat -ano | findstr :5000

# Expected output: Should show listening on 0.0.0.0:5000
```

### Step 2: Test Backend Health Check
Open in browser: http://localhost:5000/api/health

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-27T...",
  "supabaseUrl": "configured",
  "firebaseConfigured": "yes"
}
```

### Step 3: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for logs starting with `[RECRUITER_JOBS]` or `[RECRUITER_APPLICANTS]`
4. Check for error messages

**Expected logs when page loads:**
```
[RECRUITER_JOBS] Loading jobs from: http://localhost:5000/api/recruiter/jobs
[RECRUITER_JOBS] Response status: 200
[RECRUITER_JOBS] Loaded 0 jobs
```

### Step 4: Check Network Tab
1. Open DevTools Network tab
2. Reload the page
3. Look for request to `api/recruiter/jobs`
4. Click on request and check:
   - **Status**: Should be 200
   - **Headers**: Check if `Authorization: Bearer {token}` is present
   - **Response**: Should show JSON with `{jobs: []}` or `{jobs: [...]}`

### Step 5: Verify Authentication
In browser console, run:
```javascript
console.log("Token:", localStorage.getItem("token"));
console.log("Role:", localStorage.getItem("role"));
```

**Expected output:**
- Token should be a long string
- Role should be "recruiter"

### Step 6: Debug Mode - Add Extra Logging
Edit `src/pages/recruiter/RecruiterJobs.tsx` and add this after line 70:

```typescript
console.log("[RECRUITER_JOBS] Debug info:", {
  apiBase: API_BASE,
  hasToken: !!localStorage.getItem("token"),
  role: localStorage.getItem("role"),
  url: `${API_BASE}/api/recruiter/jobs`
});
```

### Step 7: Manual Test - Use DevTools Fetch
In browser console, run:
```javascript
const token = localStorage.getItem("token");
fetch("http://localhost:5000/api/recruiter/jobs", {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(r => r.json())
  .then(data => console.log("Response:", data))
  .catch(e => console.error("Error:", e));
```

**Expected output:**
```
Response: {jobs: Array(0)}
// or
Response: {jobs: Array(3)} // if jobs exist
```

---

## Common Issues & Solutions

### Issue: "Not authenticated. Please sign in."
**Cause**: Token not in localStorage or expired
**Solution**:
1. Sign in again
2. Check if redirect worked
3. Verify token with: `localStorage.getItem("token")`

### Issue: Response status 401
**Cause**: Invalid or expired token
**Solution**:
1. Sign out and sign in again
2. Check if Firebase is configured
3. Verify FIREBASE_SERVICE_ACCOUNT_PATH in backend/.env

### Issue: Response status 403
**Cause**: Not a recruiter or role check failed
**Solution**:
1. Verify localStorage.role === "recruiter"
2. Check if user profile has role="recruiter" in Supabase
3. Look at backend logs for rejection reason

### Issue: Response status 500
**Cause**: Server error, likely Supabase issue
**Solution**:
1. Check backend logs
2. Verify Supabase is configured: `echo $SUPABASE_URL` in backend directory
3. Test Supabase directly
4. Check if tables exist: profiles, jobs, applications

### Issue: No data loads but no error
**Cause**: Silent error or data fetch hanging
**Solution**:
1. Check console for `[RECRUITER_*]` logs
2. Check network tab for failed requests
3. Verify token is valid with manual fetch test
4. Check if API endpoint responds at all

---

## Database Setup Verification

### Check if Jobs Table Exists
Backend: Check your Supabase dashboard or run:
```sql
SELECT * FROM jobs LIMIT 1;
```

### Check if Applications Table Exists
```sql
SELECT * FROM applications LIMIT 1;
```

### Check if Profiles Table Exists
```sql
SELECT * FROM profiles LIMIT 1;
```

### If Tables Don't Exist
Run the migration:
```bash
# In backend directory
psql -U postgres -d your_db -f supabase/schema.sql
```

---

## End-to-End Test Flow

### Test 1: Jobs List (No Creation)
1. Navigate to `/recruiter/jobs`
2. Open Console (F12)
3. Should see `[RECRUITER_JOBS]` logs
4. Should see message "No jobs yet" or list of jobs
5. No error message should appear

### Test 2: Create a Job
1. On Jobs page, fill form:
   - Title: "Senior Developer" (required)
   - Team: "Engineering"
   - Type: "Full-time"
2. Click "Post Job" button
3. Should see success toast: "Job created"
4. Job should appear in list
5. Console should show `[RECRUITER_JOBS_CREATE]` logs

### Test 3: Pipeline List (Applicants)
1. Navigate to `/recruiter/applicants`
2. Open Console (F12)
3. Should see `[RECRUITER_APPLICANTS]` logs
4. Should see 5 columns: New, Screen, Interview, Offer, Hired
5. Columns should show "No candidates" or list applicants
6. No error message should appear

### Test 4: Filter by Job
1. From Jobs page, click "Review" on a job
2. Should navigate to `/recruiter/applicants?jobId={jobId}`
3. Should show only that job's applicants

### Test 5: Message Feature
1. On Pipeline page, click message icon on an applicant
2. Should navigate to `/recruiter/messages`
3. Console should show `[RECRUITER_MESSAGE]` logs

---

## API Endpoint Reference

### GET /api/recruiter/jobs
```
Request:
  GET http://localhost:5000/api/recruiter/jobs
  Headers: {Authorization: "Bearer {token}"}

Response (200):
  {
    "jobs": [
      {
        "id": "uuid",
        "title": "Senior Developer",
        "team": "Engineering",
        "company": "Acme Corp",
        "location": "San Francisco",
        "type": "Full-time",
        "salary": "$150k-200k",
        "deadline": "2026-03-31",
        "status": "Open",
        "description": "...",
        "created_at": "2026-02-27T...",
        "applicants": 0
      }
    ]
  }

Response (401): {message: "Invalid token"}
Response (403): {message: "Recruiter access required"}
Response (500): {message: "Supabase error..."}
```

### POST /api/recruiter/jobs
```
Request:
  POST http://localhost:5000/api/recruiter/jobs
  Headers: {Authorization: "Bearer {token}", "Content-Type": "application/json"}
  Body: {
    "title": "Senior Developer",
    "team": "Engineering",
    "company": "Acme",
    "location": "SF",
    "type": "Full-time",
    "salary": "$150k",
    "deadline": "2026-03-31",
    "status": "Open",
    "description": "..."
  }

Response (201): {job: {...}}
Response (400): {message: "Title is required"}
Response (401): {message: "Invalid token"}
Response (403): {message: "Recruiter access required"}
```

### GET /api/recruiter/applicants
```
Request:
  GET http://localhost:5000/api/recruiter/applicants
  Headers: {Authorization: "Bearer {token}"}

Response (200):
  {
    "applicants": [
      {
        "id": "uuid",
        "status": "New",
        "created_at": "2026-02-27T...",
        "job": {
          "id": "job-uuid",
          "title": "Senior Developer",
          "team": "Engineering"
        },
        "candidate": {
          "id": "candidate-uuid",
          "name": "John Doe",
          "role": "Developer",
          "college": "Stanford",
          "avatar_url": "https://..."
        }
      }
    ]
  }

Response (401): {message: "Invalid token"}
Response (403): {message: "Recruiter access required"}
```

### PATCH /api/recruiter/applicants/:id
```
Request:
  PATCH http://localhost:5000/api/recruiter/applicants/{id}
  Headers: {Authorization: "Bearer {token}", "Content-Type": "application/json"}
  Body: {"status": "Interview"}

Response (200): {applicant: {...}}
Response (404): {message: "Applicant not found"}
```

---

## Frontend Debug Checklist for Users

- [ ] Navigate to `/recruiter/jobs`
- [ ] Check Console for `[RECRUITER_JOBS]` logs  
- [ ] Check if error section appears at top
- [ ] Click "Retry Loading" if error shows
- [ ] Check Network tab for API responses
- [ ] Verify token exists: `localStorage.getItem("token")`
- [ ] Verify role is recruiter: `localStorage.getItem("role")`
- [ ] Try creating a test job
- [ ] Try navigating to `/recruiter/applicants`
- [ ] Check if pipeline displays 5 columns

---

## Backend Restart (If Needed)

```powershell
# Kill existing process on port 5000
netstat -ano | findstr :5000 | %{$_.Split()[4]} | %{$_ -as [int]} | %{taskkill /PID $_ /F}

# Start backend again
cd backend
npm run dev
```

---

## Success Indicators

✅ Frontend loads without JavaScript errors
✅ Console shows `[RECRUITER_*]` logs with HTTP 200 responses
✅ Jobs page displays "No jobs yet" (with no error)
✅ Pipeline page displays 5-stage Kanban (with no error)
✅ Can create jobs successfully
✅ Can move applicants through pipeline
✅ All buttons are clickable
✅ Error messages appear inline if issues occur

---

**Last Updated**: February 27, 2026  
**Status**: Ready for testing and debugging
