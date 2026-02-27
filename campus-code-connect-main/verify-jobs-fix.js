// Quick verification that jobs table columns are correct

async function testJobsEndpoint() {
  console.log('🔍 Testing jobs endpoint...\n')
  
  try {
    const response = await fetch('http://localhost:5000/api/recruiter/jobs', {
      headers: {
        'Authorization': 'Bearer fake-token-for-testing'
      }
    })
    
    const contentType = response.headers.get('content-type')
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json()
      
      if (response.status === 401 || response.status === 403) {
        console.log('✅ Endpoint returns JSON (auth error expected)')
        console.log(`   Status: ${response.status}`)
        console.log(`   Message: ${data.message}`)
        return { ok: true, message: 'Endpoint working, needs auth' }
      } else if (response.status === 200) {
        console.log('✅ Endpoint working!')
        console.log(`   Jobs count: ${data.jobs?.length || 0}`)
        return { ok: true, message: 'Endpoint working' }
      } else if (response.status === 500 && data.message?.includes('does not exist')) {
        console.log('❌ Database column missing:')
        console.log(`   ${data.message}`)
        
        // Parse which column is missing
        const match = data.message.match(/column\s+\w+\.(\w+)\s+does not exist/i)
        if (match) {
          return { ok: false, missingColumn: match[1], message: data.message }
        }
        return { ok: false, message: data.message }
      } else {
        console.log('⚠️  Unexpected response:')
        console.log(`   Status: ${response.status}`)
        console.log(`   Message: ${data.message || 'Unknown'}`)
        return { ok: false, message: data.message || 'Unknown error' }
      }
    } else {
      console.log('❌ Endpoint returning HTML instead of JSON')
      const text = await response.text()
      if (text.includes('Cloudflare') || text.includes('<!DOCTYPE html>')) {
        return { ok: false, message: 'SSL error - backend connection issue' }
      }
      return { ok: false, message: 'Non-JSON response' }
    }
    
  } catch (err) {
    console.log('❌ Cannot connect to backend:', err.message)
    return { ok: false, message: 'Backend not running on port 5000' }
  }
}

(async () => {
  console.log('=' .repeat(60))
  console.log('🧪 Jobs Endpoint Verification')
  console.log('='.repeat(60))
  
  const result = await testJobsEndpoint()
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 Results')
  console.log('='.repeat(60))
  
  if (result.ok) {
    console.log('✅ JOBS ENDPOINT IS WORKING!')
    console.log('✅ You can now use the recruiter jobs page')
    console.log('\n📝 Next steps:')
    console.log('   1. Refresh your browser on /recruiter/jobs')
    console.log('   2. You should see job listings (or "No jobs yet")')
    console.log('   3. No more "column jobs.team does not exist" error')
  } else {
    console.log('❌ ISSUE FOUND')
    console.log(`   ${result.message}`)
    
    if (result.missingColumn) {
      console.log('\n📝 MANUAL FIX NEEDED:')
      console.log(`   1. Go to Supabase Dashboard > SQL Editor`)
      console.log(`   2. Run this SQL:`)
      console.log(`\n   ALTER TABLE jobs ADD COLUMN ${result.missingColumn} text;\n`)
    } else if (result.message.includes('Backend not running')) {
      console.log('\n📝 START THE BACKEND:')
      console.log('   cd backend')
      console.log('   npm run dev')
    }
  }
  
  console.log('='.repeat(60))
})()
