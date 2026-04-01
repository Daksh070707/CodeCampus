import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const connection = process.env.SUPABASE_DB_URL || process.env.SUPABASE_CONNECTION_STRING
if (!connection) {
  console.error('❌ SUPABASE_DB_URL not found in env')
  process.exit(1)
}

const sqlPath = path.resolve(__dirname, '..', 'supabase', 'add-post-attachments-columns.sql')
if (!fs.existsSync(sqlPath)) {
  console.error('❌ SQL file not found:', sqlPath)
  process.exit(1)
}

const sql = fs.readFileSync(sqlPath, 'utf8')

async function run() {
  const client = new Client({
    connectionString: connection,
    ssl: { rejectUnauthorized: false },
  })

  try {
    console.log('🔄 Connecting to database...')
    await client.connect()

    console.log('🔄 Applying posts columns migration...')
    const result = await client.query(sql)

    console.log('✅ Migration applied successfully.')
    if (result.rows?.length) {
      console.log('📋 Verified columns:')
      for (const row of result.rows) {
        console.log(`   - ${row.column_name} (${row.data_type})`)
      }
    }
  } catch (error) {
    console.error('❌ Failed to apply migration:', error.message)
    if (String(error.message || '').includes('ENOTFOUND')) {
      console.error('')
      console.error('💡 DNS could not resolve your direct DB host.')
      console.error('   Use Supabase Dashboard -> Connect -> Transaction pooler and copy the URI.')
      console.error('   Then set SUPABASE_DB_URL in backend/.env to that pooler URI (port 6543, sslmode=require).')
      console.error('')
      console.error('   Example format:')
      console.error('   SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<PASSWORD>@<region>.pooler.supabase.com:6543/postgres?sslmode=require')
    }
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()
