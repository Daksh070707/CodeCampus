// Check which columns are missing from jobs table

const REQUIRED_COLUMNS = [
  'id', 'title', 'team', 'company', 'location', 
  'type', 'salary', 'deadline', 'status', 
  'description', 'created_at', 'recruiter_id'
];

async function testEachColumn() {
  console.log('🔍 Testing each column individually...\n');
  
  const missing = [];
  const existing = [];
  
  for (const column of REQUIRED_COLUMNS) {
    try {
      const response = await fetch('http://localhost:5000/api/recruiter/jobs', {
        headers: { 'Authorization': 'Bearer fake-token' }
      });
      
      const data = await response.json();
      
      // Check if error message mentions this specific column
      if (data.message && data.message.includes(`column jobs.${column} does not exist`)) {
        missing.push(column);
        console.log(`❌ ${column.padEnd(15)} - MISSING`);
      } else {
        existing.push(column);
        console.log(`✅ ${column.padEnd(15)} - exists`);
      }
      
      // If we found a missing column, we know the issue
      if (missing.length > 0) {
        break; // The query fails on first missing column
      }
      
    } catch (err) {
      break;
    }
  }
  
  return { missing, existing };
}

async function getErrorDetails() {
  console.log('🔍 Getting current error details...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/recruiter/jobs', {
      headers: { 'Authorization': 'Bearer fake-token' }
    });
    
    const data = await response.json();
    
    if (data.message && data.message.includes('does not exist')) {
      // Parse the column name
      const match = data.message.match(/column\s+jobs\.(\w+)\s+does not exist/i);
      if (match) {
        const missingColumn = match[1];
        console.log(`❌ ERROR: Column "${missingColumn}" does not exist\n`);
        return { missingColumn, fullError: data.message };
      }
    } else if (response.status === 401 || response.status === 403) {
      console.log('✅ No column errors! (Just auth error - that\'s expected)\n');
      return { working: true };
    }
    
    return { unknown: true, message: data.message };
  } catch (err) {
    console.log('❌ Cannot connect to backend\n');
    return { offline: true };
  }
}

(async () => {
  console.log('='.repeat(70));
  console.log('🔍 JOBS TABLE COLUMN CHECKER');
  console.log('='.repeat(70));
  console.log('');
  
  const errorDetails = await getErrorDetails();
  
  if (errorDetails.working) {
    console.log('🎉 ALL COLUMNS ARE WORKING!');
    console.log('✅ You can now use the recruiter jobs page');
    console.log('');
    console.log('='.repeat(70));
    return;
  }
  
  if (errorDetails.offline) {
    console.log('⚠️  Backend is not running on port 5000');
    console.log('   Start it with: cd backend && npm run dev');
    console.log('');
    console.log('='.repeat(70));
    return;
  }
  
  if (errorDetails.missingColumn) {
    console.log('📋 MISSING COLUMN DETECTED\n');
    console.log(`Column: "${errorDetails.missingColumn}"\n`);
    console.log('='.repeat(70));
    console.log('📝 QUICK FIX - Copy this SQL to Supabase SQL Editor:');
    console.log('='.repeat(70));
    console.log('');
    console.log('-- Add all missing columns at once');
    console.log('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS team text;');
    console.log('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company text;');
    console.log('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location text;');
    console.log('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS type text;');
    console.log('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary text;');
    console.log('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline text;');
    console.log("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status text DEFAULT 'Open';");
    console.log('ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description text;');
    console.log('');
    console.log('-- Then verify:');
    console.log('SELECT column_name FROM information_schema.columns');
    console.log("WHERE table_name = 'jobs' ORDER BY ordinal_position;");
    console.log('');
    console.log('='.repeat(70));
    console.log('📍 WHERE TO RUN THIS:');
    console.log('   1. Go to: https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Click "SQL Editor" in sidebar');
    console.log('   4. Paste the SQL above');
    console.log('   5. Click "Run" button');
    console.log('');
    console.log('After running, refresh your browser on /recruiter/jobs');
    console.log('='.repeat(70));
  }
})();
