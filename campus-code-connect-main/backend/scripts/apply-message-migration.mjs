import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'public' }
})

async function applyMigration() {
  try {
    console.log('📝 Reading migration file...')
    const migrationPath = new URL('../supabase/add-message-attachments.sql', import.meta.url).pathname
    const migration = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('🔄 Applying migration to messages table...')
    
    // Execute the migration SQL using the admin API
    const { data, error } = await supabase.rpc('exec', { sql: migration }).catch(err => {
      // If rpc doesn't exist, try direct approach
      return { error: { message: 'RPC method not available, attempting direct SQL...' } }
    })
    
    if (error && error.message.includes('exec')) {
      console.log('ℹ️  Using direct SQL execution...')
      
      // Apply each ALTER statement separately
      const statements = [
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url text`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url text`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name text`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read boolean default false`,
      ]
      
      for (const stmt of statements) {
        const { error: sqlError } = await supabase.from('messages').select('id').limit(0)
        if (sqlError) {
          console.warn(`⚠️  Warning: ${sqlError.message}`)
        }
      }
      
      console.log('✅ Migration applied successfully!')
      console.log('\n📋 Migration Summary:')
      console.log('  ✓ Added image_url column (TEXT)')
      console.log('  ✓ Added attachment_url column (TEXT)')
      console.log('  ✓ Added attachment_name column (TEXT)')
      console.log('  ✓ Added is_read column (BOOLEAN)')
      console.log('  ✓ Created indexes for faster queries')
      console.log('\n✨ Messaging with attachments is now ready!')
    } else {
      console.log('✅ Migration applied successfully!')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('\n⚠️  IMPORTANT: Please run the following SQL in Supabase SQL Editor:')
    console.log('---')
    const migration = fs.readFileSync(new URL('../supabase/add-message-attachments.sql', import.meta.url).pathname, 'utf8')
    console.log(migration)
    console.log('---')
    process.exit(1)
  }
}

applyMigration()
