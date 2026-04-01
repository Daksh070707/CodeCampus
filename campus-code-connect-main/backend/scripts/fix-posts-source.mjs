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

const sqlPath = path.resolve(__dirname, '..', 'supabase', 'add-post-source-column.sql')
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

    console.log('🔄 Applying posts source migration...')
    const result = await client.query(sql)

    console.log('✅ Migration applied successfully.')
    if (result.rows?.length) {
      console.log('📋 Source distribution after backfill:')
      for (const row of result.rows) {
        console.log(`   - ${row.source}: ${row.total}`)
      }
    }
  } catch (error) {
    console.error('❌ Failed to apply migration:', error.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()
