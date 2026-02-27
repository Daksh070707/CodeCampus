// Quick fix script to add the missing 'team' column to jobs table
import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

// Enable SSL bypass for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const connection = process.env.SUPABASE_DB_URL || process.env.SUPABASE_CONNECTION_STRING
if (!connection) {
  console.error('❌ SUPABASE_DB_URL not found in .env')
  console.error('   Make sure backend/.env has: SUPABASE_DB_URL=postgresql://...')
  process.exit(1)
}

const migrationSQL = `
-- Add team column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'team'
    ) THEN
        ALTER TABLE jobs ADD COLUMN team text;
        RAISE NOTICE 'Column "team" added to jobs table';
    ELSE
        RAISE NOTICE 'Column "team" already exists in jobs table';
    END IF;
END $$;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;
`;

async function run() {
  console.log('🔄 Connecting to Supabase database...');
  console.log('   Database:', connection.split('@')[1]?.split('/')[0] || 'configured');
  
  const client = new Client({ 
    connectionString: connection,
    ssl: false // Bypass SSL verification for development
  })
  
  try {
    await client.connect()
    console.log('✅ Connected to database');
    
    console.log('\n🔄 Adding missing "team" column to jobs table...');
    const result = await client.query(migrationSQL)
    
    console.log('✅ Migration completed successfully!');
    
    if (result.rows && result.rows.length > 0) {
      console.log('\n📋 Current jobs table columns:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    }
    
    console.log('\n🎉 Fix applied! You can now:');
    console.log('   1. Refresh your browser');
    console.log('   2. Navigate to /recruiter/jobs');
    console.log('   3. The page should load without errors');
    
  } catch (e) {
    console.error('\n❌ Migration failed:', e.message);
    console.error('\n💡 Manual fix:');
    console.error('   1. Go to https://supabase.com/dashboard');
    console.error('   2. Select your project');
    console.error('   3. Go to SQL Editor');
    console.error('   4. Run this SQL:');
    console.error('\n   ALTER TABLE jobs ADD COLUMN IF NOT EXISTS team text;');
    console.error('');
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()
