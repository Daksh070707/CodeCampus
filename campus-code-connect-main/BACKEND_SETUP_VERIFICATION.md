# Backend Setup & Verification Guide

## Status Check

### 1. Verify Backend Environment Configuration
Your backend `.env` file has been configured with Supabase credentials. The file contains:
- `SUPABASE_URL`: Configured ✓
- `SUPABASE_SERVICE_ROLE_KEY`: Configured ✓
- `FIREBASE_SERVICE_ACCOUNT_PATH`: Configured ✓
- `PORT`: Set to 5000 ✓

### 2. Test Backend Health Endpoint

**Via Browser:**
Navigate to: http://localhost:5000/api/health

**Expected response (healthy):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-27T...",
  "supabaseUrl": "configured",
  "firebaseConfigured": "yes"
}
```

**Expected response (misconfigured):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-27T...",
  "supabaseUrl": "missing",
  "firebaseConfigured": "no"
}
```

---

## If Backend is NOT Running Properly

### Step 1: Kill Existing Process
```powershell
# Find and kill process on port 5000
$ports = netstat -ano | findstr :5000
if ($ports) {
  $pid = $ports | ForEach-Object { $_.Split()[-1] } | Select-Object -First 1
  taskkill /PID $pid /F
  Write-Host "Killed process $pid"
}
```

### Step 2: Verify Dependencies
```powershell
cd backend
npm list dotenv
npm list @supabase/supabase-js
npm list firebase-admin
npm list express
npm list cors
```

### Step 3: Check for NPM Installation Issues
```powershell
cd backend
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
```

### Step 4: Start Backend with Debugging
```powershell
cd backend
$env:DEBUG = "*"; npm run dev
```

**Expected output:**
```
🚀 Server running on http://localhost:5000
```

---

## Verify Database Connection

### Via Health Endpoint
Check http://localhost:5000/api/health to see if Supabase is connected.

### Via Backend Route
Create a test route (optional debugging):
```javascript
// Add to backend/routes/test.js
import express from "express";
import { getSupabase } from "../config/supabase.js";

const router = express.Router();

router.get("/db-test", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("count(*)")
      .limit(1)
      .single();
    
    if (error) {
      return res.status(500).json({ 
        message: "DB Error", 
        error: error.message 
      });
    }
    
    res.json({ 
      status: "ok",
      message: "Database is connected",
      profiles_connection: "working"
    });
  } catch (e) {
    res.status(500).json({ 
      message: "Server Error", 
      error: e.message 
    });
  }
});

export default router;
```

Then add to `server.js`:
```javascript
import testRoutes from "./routes/test.js";
app.use("/api/test", testRoutes);
```

Test at: http://localhost:5000/api/test/db-test

---

## Verify Recruiter Routes Are Working

### 1. Get Auth Token
```javascript
// In browser console:
console.log(localStorage.getItem("token"));
```

### 2. Test Jobs Endpoint
```bash
# Via browser console:
const token = localStorage.getItem("token");
fetch("http://localhost:5000/api/recruiter/jobs", {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(r => r.json())
  .then(d => console.log(d));
```

### 3. Test Applicants Endpoint
```bash
const token = localStorage.getItem("token");
fetch("http://localhost:5000/api/recruiter/applicants", {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(r => r.json())
  .then(d => console.log(d));
```

---

## Verify Supabase Schema

### Check Tables Exist
```bash
# Via Supabase dashboard UI:
1. Navigate to Tables
2. Look for: profiles, jobs, applications
3. If missing, run schema migration
```

### Run Schema Migration
```bash
# Via terminal in backend directory:
npm run migrate
# or manually:
psql postgresql://postgres:{password}@db.qcmcfqmsudgaggsvxcpx.supabase.co:5432/postgres < supabase/schema.sql
```

### Check Jobs Table Structure
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'jobs';
```

Expected columns:
- id (uuid)
- recruiter_id (uuid) 
- title (text)
- team (text)
- company (text)
- location (text)
- type (text)
- salary (text)
- deadline (date)
- status (text)
- description (text)
- created_at (timestamp)

### Check Applications Table Structure
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'applications';
```

Expected columns:
- id (uuid)
- recruiter_id (uuid)
- job_id (uuid)
- candidate_id (uuid)
- status (text)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)

---

## Common Backend Errors

### Error: "Supabase client is not configured"
**Cause**: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env
**Solution**:
1. Verify backend/.env has both variables
2. Restart backend with: `npm run dev`
3. Test health endpoint

### Error: "Invalid backend request"
**Cause**: Backend process not running
**Solution**:
1. Check: `netstat -ano | findstr :5000`
2. If not running, start with: `npm run dev` (from backend directory)
3. Verify output shows: "🚀 Server running on http://localhost:5000"

### Error: "Profile not found"
**Cause**: Recruiter user not in Supabase profiles table
**Solution**:
1. Check Supabase dashboard
2. Verify user record exists with role="recruiter"
3. Verify firebase_uid matches auth token

### Error: "Recruiter access required"
**Cause**: Logged-in user doesn't have recruiter role
**Solution**:
1. Update user role in Supabase to "recruiter"
2. Sign out and sign back in
3. Check localStorage.role === "recruiter"

---

## Quick Restart Procedure

```powershell
# Kill backend
$pid = (netstat -ano | findstr :5000).Split()[-1]
if ($pid) { taskkill /PID $pid /F }

# Restart
cd backend
npm run dev

# Verify
# Wait for "🚀 Server running..." message
# Test: http://localhost:5000/api/health
```

---

## If All Else Fails - Manual Verification

### 1. Manually run Supabase query
```bash
# Using Supabase CLI or direct SQL:
psql postgresql://postgres:Dakshkoli123@db.qcmcfqmsudgaggsvxcpx.supabase.co:5432/postgres
```

### 2. Test Node.js can load modules
```bash
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"
```

Expected: Should print Supabase URL

### 3. Test Supabase client directly
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('profiles').select().limit(1).then(r => console.log(r));
"
```

Expected: Should show data or empty array, not error

---

## Status After This Guide

✅ Backend environment configured
✅ Health endpoint available for testing  
✅ Supabase connection methods verified
✅ Recruiter routes ready to test
✅ Database schema validation steps provided
✅ Common errors and solutions documented

**Next**: Navigate to `/recruiter/jobs` and check console for logs with `[RECRUITER_JOBS]` prefix
