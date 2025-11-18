import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables from .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

let db: any

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not defined. Please check your .env.local file.')
  }

  const sql = neon(process.env.DATABASE_URL)
  db = drizzle(sql)
  console.log('✅ Database connection initialized successfully')
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error('❌ Failed to initialize database connection:', errorMessage)
  console.error('Error details:', {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlLength: process.env.DATABASE_URL?.length,
    nodeEnv: process.env.NODE_ENV,
  })

  // In production, fail fast. In development, optionally provide mock for testing
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Database connection failed: ${errorMessage}. ` +
      'Database connectivity is required in production environments.'
    )
  }

  // Development fallback with warning
  console.warn('⚠️  Using mock database for development. This will not persist data.')

  // Mock database that properly chains Drizzle ORM methods
  const createQueryChain = () => ({
    limit: () => Promise.resolve([]),
    where: () => ({ limit: () => Promise.resolve([]) }),
    returning: () => Promise.resolve([])
  });

  db = {
    select: () => ({
      from: () => createQueryChain()
    }),
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([{ id: 'mock-id' }])
      })
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([{ id: 'mock-id' }])
        })
      })
    }),
    delete: () => ({
      where: () => ({
        returning: () => Promise.resolve([])
      })
    })
  }
}

export { db }