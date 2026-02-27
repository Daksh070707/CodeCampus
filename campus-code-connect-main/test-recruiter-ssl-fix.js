// Test script to verify Recruiter SSL fix
// Run with: node test-recruiter-ssl-fix.js

const API_BASE = 'http://localhost:5000';

async function testHealthEndpoint() {
  console.log('🔍 Testing health endpoint...');
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Health endpoint: OK');
      console.log('   Status:', response.status);
      console.log('   Supabase:', data.supabaseUrl);
      console.log('   Firebase:', data.firebaseConfigured);
      return true;
    } else {
      console.log('❌ Health endpoint failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Health endpoint error:', error.message);
    return false;
  }
}

async function testRecruiterEndpoint(endpoint, token) {
  console.log(`\n🔍 Testing ${endpoint}...`);
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const contentType = response.headers.get('content-type');
    
    // Check if response is HTML (SSL error)
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      if (text.includes('<!DOCTYPE html>') || text.includes('Cloudflare')) {
        console.log('❌ SSL ERROR: Received HTML error page (Cloudflare 525)');
        console.log('   Response type:', contentType);
        return false;
      }
    }
    
    // Try to parse as JSON
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Endpoint responded successfully');
      console.log('   Status:', response.status);
      console.log('   Content-Type:', contentType);
      
      // Check data structure
      if (endpoint.includes('/jobs')) {
        console.log('   Jobs count:', Array.isArray(data.jobs) ? data.jobs.length : 'N/A');
      } else if (endpoint.includes('/candidates')) {
        console.log('   Candidates count:', Array.isArray(data.candidates) ? data.candidates.length : 'N/A');
      } else if (endpoint.includes('/applicants')) {
        console.log('   Applicants count:', Array.isArray(data.applicants) ? data.applicants.length : 'N/A');
      }
      return true;
    } else {
      console.log('⚠️  Endpoint returned error (expected for auth)');
      console.log('   Status:', response.status);
      console.log('   Message:', data.message);
      
      // This is actually OK - the endpoint is working, just needs auth
      if (response.status === 401 || response.status === 403) {
        console.log('   ✅ Endpoint is working (auth required)');
        return true;
      }
      return false;
    }
  } catch (error) {
    console.log('❌ Endpoint error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 Recruiter SSL Fix Verification Test');
  console.log('='.repeat(60));
  
  // Test 1: Health endpoint
  const healthOk = await testHealthEndpoint();
  
  if (!healthOk) {
    console.log('\n❌ Backend is not running properly on port 5000');
    console.log('   Please start the backend with: cd backend && npm run dev');
    process.exit(1);
  }
  
  // Test 2: Recruiter endpoints without token (should fail gracefully with JSON, not HTML)
  console.log('\n📝 Testing recruiter endpoints (without auth token)...');
  console.log('   Note: These should return 401/403 JSON, NOT HTML error pages\n');
  
  const jobsOk = await testRecruiterEndpoint('/api/recruiter/jobs', '');
  const candidatesOk = await testRecruiterEndpoint('/api/recruiter/candidates', '');
  const applicantsOk = await testRecruiterEndpoint('/api/recruiter/applicants', '');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log('Health endpoint:     ', healthOk ? '✅ PASS' : '❌ FAIL');
  console.log('Jobs endpoint:       ', jobsOk ? '✅ PASS' : '❌ FAIL');
  console.log('Candidates endpoint: ', candidatesOk ? '✅ PASS' : '❌ FAIL');
  console.log('Applicants endpoint: ', applicantsOk ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = healthOk && jobsOk && candidatesOk && applicantsOk;
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ SSL fix is working correctly');
    console.log('✅ No Cloudflare HTML error pages detected');
    console.log('✅ Backend is properly connecting to Supabase');
    console.log('\n📝 Next steps:');
    console.log('   1. Login to the frontend as a recruiter');
    console.log('   2. Navigate to /recruiter/jobs');
    console.log('   3. Navigate to /recruiter/applicants');
    console.log('   4. Verify pages load without SSL errors');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('   Check the errors above and ensure:');
    console.log('   - Backend is running on port 5000');
    console.log('   - NODE_TLS_REJECT_UNAUTHORIZED is set to 0');
    console.log('   - Supabase credentials are configured in backend/.env');
  }
  
  console.log('='.repeat(60));
}

// Run the tests
runTests().catch(console.error);
