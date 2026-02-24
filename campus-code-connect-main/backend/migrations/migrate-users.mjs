import dotenv from 'dotenv'
import fs from 'fs'
import { MongoClient } from 'mongodb'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const MONGO_URI = process.env.MONGO_URI
const MONGO_DB = process.env.MONGO_DB || 'test'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!MONGO_URI) {
  console.error('MONGO_URI is required in env to run migration')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required in env to run migration')
  process.exit(1)
}

const mongo = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function run() {
  await mongo.connect()
  const db = mongo.db(MONGO_DB)
  const usersCol = db.collection('users')

  const cursor = usersCol.find({})
  const mapping = []
  let count = 0

  while (await cursor.hasNext()) {
    const u = await cursor.next()
    try {
      const email = u.email
      const name = u.name || u.displayName || null
      const role = u.role || 'student'

      // cannot recover hashed password; set a random temporary password
      const tempPassword = crypto.randomBytes(12).toString('base64url')

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        user_metadata: { name, role, legacy_mongo_id: String(u._id) }
      })

      if (error) {
        console.error('Failed to create supabase user for', email, error.message)
        mapping.push({ legacy: String(u._id), email, error: error.message })
        continue
      }

      const newUser = data.user || data
      // upsert profile row
      try {
        await supabase.from('profiles').upsert({ id: newUser.id, name, email, role })
      } catch (e) {
        console.warn('Profile upsert failed for', email, e.message)
      }

      mapping.push({ legacy: String(u._id), email, supabase_id: newUser.id })
      count++
      console.log(`Migrated ${email} -> ${newUser.id}`)
    } catch (e) {
      console.error('Error migrating user', u && u.email, e.message)
    }
  }

  const out = { migrated: count, mapping }
  fs.writeFileSync('./backend/migrations/mapping.json', JSON.stringify(out, null, 2))
  console.log('Migration complete. Mapped', count, 'users. See backend/migrations/mapping.json')

  await mongo.close()
}

run().catch(err => { console.error(err); process.exit(1) })
