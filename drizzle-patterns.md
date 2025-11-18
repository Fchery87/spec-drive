---
description: Drizzle ORM patterns and best practices used in the Spec Drive project
globs: *.ts, *.tsx
alwaysApply: false
---

# Drizzle ORM Patterns & Best Practices

This guide documents the Drizzle ORM patterns, configurations, and best practices specific to the Spec Drive project. It covers the HTTP adapter setup, schema design, query patterns, error handling, and transaction management.

## Table of Contents

1. [Connection Setup](#connection-setup)
2. [HTTP Adapter Benefits](#http-adapter-benefits)
3. [Schema Design Patterns](#schema-design-patterns)
4. [Query Patterns](#query-patterns)
5. [Type Inference](#type-inference)
6. [Transaction Management](#transaction-management)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)

## Connection Setup

### Why HTTP Adapter?

The project uses the **Neon HTTP adapter** (`drizzle-orm/neon-http`) specifically because:

1. **Serverless/Stateless Environment**: The application is designed to run on serverless platforms (Vercel, AWS Lambda) where long-lived connections are problematic.
2. **Low Latency for Single Queries**: HTTP connections incur minimal overhead for individual queries in edge/serverless contexts.
3. **No Connection Pooling Required**: Each request is independent; no need to maintain persistent connections.
4. **Automatic Scaling**: Works seamlessly with platforms that spawn/destroy instances dynamically.

### Current Implementation

Located in [src/db/index.ts](src/db/index.ts):

```typescript
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import 'dotenv/config'

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

  // Production: fail fast
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Database connection failed: ${errorMessage}`)
  }

  // Development: use mock for testing
  console.warn('⚠️  Using mock database for development.')
  db = { /* mock implementation */ }
}

export { db }
```

**Key Points**:
- Explicit DATABASE_URL validation on startup
- Environment-specific error handling (fail in production, warn in development)
- Clear console logging for connection status
- Graceful degradation with mock database in dev mode

## HTTP Adapter Benefits

### Advantages

| Aspect | Benefit |
|--------|---------|
| **Latency** | Each query is a single HTTP round-trip, minimal overhead |
| **Scaling** | No connection pool limits; serverless-friendly |
| **Simplicity** | No WebSocket setup, pooling, or long-lived state management |
| **Deployment** | Works on Edge Runtime (Vercel, Cloudflare, etc.) |
| **Development** | No need for docker services during local dev |

### Trade-offs

| Trade-off | Impact |
|-----------|--------|
| **Persistent Connections** | Cannot maintain long-lived transaction contexts |
| **Bulk Operations** | Each operation is a separate HTTP call (mitigated via batch operations) |
| **Real-time Features** | Not suitable for WebSocket-based subscriptions |

## Schema Design Patterns

### Table Definition Pattern

Located in [src/db/schema.ts](src/db/schema.ts), all tables follow this pattern:

```typescript
import { pgTable, uuid, text, varchar, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
```

**Best Practices Applied**:

1. **UUIDs for Primary Keys**: `uuid('id').defaultRandom().primaryKey()`
   - Database generates random UUIDs automatically
   - URL-safe and globally unique
   - Better privacy than sequential integers

2. **Timestamps with Timezone**: `timestamp('field_name', { withTimezone: true })`
   - Always include timezone info for consistency across regions
   - Use `defaultNow()` for automatic timestamps
   - Distinguish between created/updated columns

3. **Field Name Convention**: Snake case in database, camelCase in TypeScript
   - Database: `password_hash`, `email_verified`, `created_at`
   - TypeScript: `passwordHash`, `emailVerified`, `createdAt`

4. **Column Length Constraints**: `varchar('email', { length: 255 })`
   - Prevents unbounded string storage
   - Aligns with database constraints

5. **JSONB for Flexible Data**: `jsonb('orchestration_state').default(sql`jsonb '{}'`)`
   - Used for complex, evolving data structures
   - Example: `phasesCompleted`, `artifactsGenerated`, `orchestrationState`
   - Default to empty object/array prevents NULL handling issues

6. **Foreign Key Relationships**:
   ```typescript
   userId: uuid('user_id')
     .references(() => users.id, { onDelete: 'cascade' })
     .notNull()
   ```
   - Enforces referential integrity
   - `onDelete: 'cascade'` ensures child records are deleted

### Multi-Table Example: User-Project Relationship

```typescript
// Users table (base)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  // ...
})

// Projects table (related)
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  // ...
})
```

This ensures:
- When a user is deleted, all their projects are automatically deleted
- Foreign key constraint prevents orphaned projects
- Type safety through TypeScript schema definitions

## Query Patterns

### Basic CRUD Operations

#### Create (Insert)

```typescript
// Single insert with return
const [newUser] = await db
  .insert(users)
  .values({
    email: 'user@example.com',
    name: 'John Doe',
    passwordHash: hashedPassword,
  })
  .returning()

// Batch insert (more efficient than multiple single inserts)
const newUsers = await db
  .insert(users)
  .values([
    { email: 'user1@example.com', name: 'User 1', passwordHash: hash1 },
    { email: 'user2@example.com', name: 'User 2', passwordHash: hash2 },
  ])
  .returning()
```

**HTTP Adapter Optimization**: Batch inserts reduce network round-trips when inserting multiple records.

#### Read (Select)

```typescript
import { eq, and, or, like } from 'drizzle-orm'

// Simple equality query
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, 'user@example.com'))

// Multiple conditions
const activeProjects = await db
  .select()
  .from(projects)
  .where(
    and(
      eq(projects.userId, userId),
      eq(projects.currentPhase, 'done')
    )
  )

// Pattern matching
const searchResults = await db
  .select()
  .from(users)
  .where(like(users.name, '%john%'))

// Limit results
const recentProjects = await db
  .select()
  .from(projects)
  .orderBy((t) => t.createdAt)
  .limit(10)
```

#### Update

```typescript
// Update with returning
const [updatedUser] = await db
  .update(users)
  .set({
    name: 'Jane Doe',
    updatedAt: new Date(),
  })
  .where(eq(users.id, userId))
  .returning()

// Partial update (only specified fields)
await db
  .update(users)
  .set({ emailVerified: true })
  .where(eq(users.id, userId))
```

#### Delete

```typescript
// Delete and return deleted records
const deleted = await db
  .delete(users)
  .where(eq(users.id, userId))
  .returning()

// Conditional delete
await db
  .delete(authSessions)
  .where(eq(authSessions.userId, userId))
```

### Join Patterns

```typescript
import { leftJoin, eq } from 'drizzle-orm'

// Left join to include users and their projects
const usersWithProjects = await db
  .select({
    userId: users.id,
    userName: users.name,
    projectCount: sql`COUNT(DISTINCT ${projects.id})`,
  })
  .from(users)
  .leftJoin(projects, eq(users.id, projects.userId))
  .groupBy(users.id, users.name)
```

### Case Study: Auth Routes Query Patterns

Located in [src/server/routes/auth.ts](src/server/routes/auth.ts):

```typescript
// Login: Find user by email (single result)
const foundUsers = await db
  .select()
  .from(users)
  .where(eq(users.email, email))

const user = foundUsers[0] // Safe because of .length check

// Password reset: Find by reset token
const foundUsers = await db
  .select()
  .from(users)
  .where(eq(users.passwordResetToken, token))

// Session invalidation: Delete all sessions for a user
await db
  .delete(authSessions)
  .where(eq(authSessions.userId, userId))

// Batch rate limit cleanup (every 15 minutes via cron)
await db
  .delete(rateLimitLog)
  .where(lt(rateLimitLog.resetAt, new Date()))
```

## Type Inference

Drizzle provides automatic TypeScript types inferred from your schema. This eliminates manual type definitions.

### Inferring Types from Tables

```typescript
// From schema.ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  // ...
})

// Type for selecting a complete user (all columns)
export type User = typeof users.$inferSelect

// Type for inserting a new user (omits id, timestamps with defaults)
export type NewUser = typeof users.$inferInsert

// Usage in auth routes
function createUser(newUser: NewUser): Promise<User> {
  return db.insert(users).values(newUser).returning()
}
```

### Benefits

| Benefit | Example |
|---------|---------|
| **Consistency** | Types always match schema; no drift |
| **Safety** | TypeScript catches mismatches at compile time |
| **Maintainability** | Update schema once, types update automatically |
| **DRY** | No duplicate type definitions |

## Transaction Management

### Basic Transaction Pattern

```typescript
import { db } from '../db'

// Atomic operation: both succeed or both fail
await db.transaction(async (tx) => {
  // First operation
  const [user] = await tx
    .insert(users)
    .values(newUser)
    .returning()

  // Second operation (sees results of first)
  await tx
    .insert(projects)
    .values({
      userId: user.id,
      name: 'First Project',
    })

  // If any operation fails, entire transaction rolls back
})
```

### Case Study: Password Reset Transaction

Located in [src/server/routes/auth.ts](src/server/routes/auth.ts):

```typescript
// Atomic password reset: both operations succeed together or both fail
await db.transaction(async (tx) => {
  // Operation 1: Update password and clear reset token
  await tx
    .update(users)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))

  // Operation 2: Invalidate all existing sessions
  // (forces re-login with new password)
  await tx
    .delete(authSessions)
    .where(eq(authSessions.userId, user.id))
})
```

**Why Transaction?**

1. **Consistency**: Password update and session invalidation must both succeed
2. **Security**: If only password updates but sessions remain, old sessions are still valid
3. **Atomicity**: No partial state if network fails mid-operation

### Limitations with HTTP Adapter

⚠️ **Important**: The HTTP adapter has limited transaction support compared to persistent connections:
- Transactions execute within a single HTTP request
- Cannot hold a transaction open across multiple requests
- Best for small, quick atomic operations

For very long-running transactions, consider alternative approaches or the WebSocket adapter.

## Error Handling

### Connection Error Handling

Located in [src/db/index.ts](src/db/index.ts):

```typescript
try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not defined')
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

  // Fail fast in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Database connection failed: ${errorMessage}`)
  }

  // Use mock database in development
  console.warn('⚠️  Using mock database for development')
  db = { /* mock implementation */ }
}
```

### Query Error Handling

```typescript
export async function safeQuery<T>(
  operation: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Database query error:', message)

    // Handle specific error types
    if (message.includes('unique constraint')) {
      return { success: false, error: 'Record already exists' }
    }
    if (message.includes('foreign key')) {
      return { success: false, error: 'Invalid reference' }
    }

    return { success: false, error: 'Database operation failed' }
  }
}

// Usage in routes
const result = await safeQuery(() =>
  db.insert(users).values(newUser).returning()
)

if (!result.success) {
  return res.status(400).json({ error: result.error })
}

const user = result.data[0]
```

### Neon-Specific Error Codes

Common Neon connection errors:

```typescript
// Connection pool timeout
if (error.message?.includes('connection pool timeout')) {
  console.error('Neon connection pool timeout - database under heavy load')
  // Retry with exponential backoff
}

// Authentication failure
if (error.message?.includes('authentication failed')) {
  console.error('Invalid DATABASE_URL credentials')
  // Check .env configuration
}

// Network timeout
if (error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout')) {
  console.error('Network error - Neon may be temporarily unavailable')
  // Retry or degrade gracefully
}
```

## Best Practices

### 1. Always Use Type-Safe Queries

✅ **Good**:
```typescript
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
```

❌ **Bad**:
```typescript
const user = await db.execute(
  `SELECT * FROM users WHERE id = ?`,
  [userId]
) // Raw SQL, loses type safety
```

### 2. Batch Operations for HTTP Adapter

✅ **Good**:
```typescript
// Single HTTP request
const results = await db
  .insert(users)
  .values(userArray)
  .returning()
```

❌ **Bad**:
```typescript
// N HTTP requests
for (const user of users) {
  await db.insert(users).values(user)
}
```

### 3. Always Handle NULL Gracefully

✅ **Good**:
```typescript
const user = foundUsers[0] // Check length first
if (!user) {
  return res.status(404).json({ error: 'User not found' })
}
```

❌ **Bad**:
```typescript
const user = foundUsers[0]
user.email // May throw if user is undefined
```

### 4. Use Transactions for Multi-Step Operations

✅ **Good**:
```typescript
await db.transaction(async (tx) => {
  const user = await createUserInTx(tx)
  const project = await createProjectInTx(tx, user.id)
  return { user, project }
})
```

❌ **Bad**:
```typescript
// Race condition: user created but project creation fails
const user = await db.insert(users).values(newUser).returning()
const project = await db.insert(projects).values({
  userId: user.id,
  name: 'Project',
})
```

### 5. Validate Environment Variables on Startup

✅ **Good**:
```typescript
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}
```

❌ **Bad**:
```typescript
// Fails at runtime during first query
const sql = neon(process.env.DATABASE_URL || '')
```

### 6. Use Prepared Statements for Repeated Queries

```typescript
// Create once, use many times (more efficient)
export const getUsersByEmail = db
  .select()
  .from(users)
  .where(eq(users.email, sql.placeholder('email')))
  .prepare('get_user_by_email')

// Usage
const result = await getUsersByEmail.execute({ email: 'user@example.com' })
```

## Common Patterns

### Finding a Single Record

```typescript
// Pattern 1: Array access with length check
const foundUsers = await db
  .select()
  .from(users)
  .where(eq(users.email, email))

if (foundUsers.length === 0) {
  throw new Error('User not found')
}

const user = foundUsers[0]

// Pattern 2: Using limit + first check (same semantics)
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .then(results => results[0])
```

### Counting Records

```typescript
import { sql } from 'drizzle-orm'

const count = await db
  .select({ count: sql<number>`COUNT(*)` })
  .from(users)
  .where(eq(users.emailVerified, true))
```

### Conditional Updates

```typescript
// Update only if condition is true
const [updated] = await db
  .update(users)
  .set({
    emailVerified: true,
    emailVerificationToken: null,
    updatedAt: new Date(),
  })
  .where(
    and(
      eq(users.id, userId),
      eq(users.emailVerificationToken, token)
    )
  )
  .returning()

if (!updated) {
  throw new Error('Token invalid or already used')
}
```

### Bulk Delete with Cascade

```typescript
// Delete user (cascades to projects, sessions, etc.)
await db
  .delete(users)
  .where(eq(users.id, userId))

// PostgreSQL foreign key constraints with onDelete: 'cascade'
// automatically handle the cleanup
```

### Date Range Queries

```typescript
import { between, gte, lte } from 'drizzle-orm'

// Range query
const recentActivity = await db
  .select()
  .from(phaseHistory)
  .where(
    between(
      phaseHistory.transitionedAt,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      new Date()
    )
  )

// Since a date
const newProjects = await db
  .select()
  .from(projects)
  .where(gte(projects.createdAt, new Date('2024-01-01')))
```

### Ordered Results

```typescript
import { desc, asc } from 'drizzle-orm'

// Most recent first
const projects = await db
  .select()
  .from(projects)
  .where(eq(projects.userId, userId))
  .orderBy(desc(projects.createdAt))
  .limit(10)

// Alphabetical
const users = await db
  .select()
  .from(users)
  .orderBy(asc(users.name))
```

## Migration and Schema Management

Using **Drizzle Kit** for migrations:

### Generate Migrations

After modifying [src/db/schema.ts](src/db/schema.ts):

```bash
npx drizzle-kit generate
```

This creates migration files in `./drizzle` directory comparing your schema to the database.

### Apply Migrations

```bash
npx drizzle-kit migrate
```

Or programmatically via your CI/CD pipeline.

### Configuration

Located in [drizzle.config.ts](drizzle.config.ts):

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

## Summary

The Spec Drive project uses Drizzle ORM with these key principles:

1. **HTTP Adapter** for serverless/stateless deployment
2. **Type-safe queries** via schema-inferred types
3. **Batch operations** to minimize HTTP round-trips
4. **Transactions** for atomic multi-step operations
5. **Explicit error handling** with environment-specific strategies
6. **Clear logging** for debugging connection and query issues
7. **PostgreSQL-first** schema design leveraging Neon's capabilities

This pattern provides a solid foundation for secure, scalable database operations while maintaining code quality and type safety.
