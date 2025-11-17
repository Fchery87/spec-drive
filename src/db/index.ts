import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import 'dotenv/config'

let db: any

try {
  const sql = neon(process.env.DATABASE_URL || '')
  db = drizzle(sql)
  console.log('✅ Database connection initialized')
} catch (error) {
  console.log('⚠️  Database not available, using mock data for development')
  // Mock database for development
  db = {
    select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
    insert: () => ({ values: () => ({ returning: () => Promise.resolve([{}]) }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([{}]) }) }) }),
    delete: () => ({ where: () => ({ returning: () => Promise.resolve([{}]) }) })
  }
}

export { db }