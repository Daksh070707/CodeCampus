import fs from 'fs'
import { Client } from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

dotenv.config()

// resolve path robustly across platforms
const sqlPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'schema.sql')
if (!fs.existsSync(sqlPath)) {
  console.error('Schema file not found at', sqlPath)
  process.exit(1)
}

const connection = process.env.SUPABASE_DB_URL || process.env.SUPABASE_CONNECTION_STRING
if (!connection) {
  console.error('Set SUPABASE_DB_URL (Postgres connection string) in env to apply schema')
  process.exit(1)
}

const sql = fs.readFileSync(sqlPath, 'utf8')

async function run(){
  const client = new Client({ connectionString: connection })
  await client.connect()
  try{
    await client.query(sql)
    console.log('Schema applied successfully')
  }catch(e){
    console.error('Failed to apply schema:', e.message)
    process.exitCode = 1
  }finally{
    await client.end()
  }
}

run()
