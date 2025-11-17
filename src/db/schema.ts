import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpiresAt: timestamp('password_reset_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Auth Sessions table for refresh tokens
export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  refreshToken: text('refresh_token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Rate limiting table
export const rateLimitLog = pgTable('rate_limit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(), // IP address or user ID
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  attempts: integer('attempts').notNull().default(1),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  idea: text('idea').notNull(),
  currentPhase: varchar('current_phase', { length: 50 })
    .notNull()
    .default('analysis'),
  phasesCompleted: jsonb('phases_completed').default(sql`jsonb '[]'`),
  stackChoice: varchar('stack_choice', { length: 255 }),
  stackApproved: boolean('stack_approved').default(false),
  dependenciesApproved: boolean('dependencies_approved').default(false),
  githubRepoUrl: varchar('github_repo_url', { length: 500 }),
  orchestrationState: jsonb('orchestration_state').default(sql`jsonb '{}'`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Phase History table
export const phaseHistory = pgTable('phase_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  fromPhase: varchar('from_phase', { length: 50 }),
  toPhase: varchar('to_phase', { length: 50 }).notNull(),
  artifactsGenerated: jsonb('artifacts_generated').default(sql`jsonb '[]'`),
  validationPassed: boolean('validation_passed').default(true),
  tokensUsed: integer('tokens_used'),
  costEstimateUsd: integer('cost_estimate_usd'),
  transitionedBy: uuid('transitioned_by'),
  transitionedAt: timestamp('transition_date', {
    withTimezone: true,
  }).defaultNow(),
});

// Project Artifacts table
export const projectArtifacts = pgTable('project_artifacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  phase: varchar('phase', { length: 50 }).notNull(),
  artifactName: varchar('artifact_name', { length: 255 }).notNull(),
  version: varchar('version', { length: 50 }).default('1.0.0'),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  contentHash: varchar('content_hash', { length: 255 }),
  frontmatter: jsonb('frontmatter'),
  content: text('content'),
  validationStatus: varchar('validation_status', { length: 20 }).default(
    'pending'
  ),
  validationErrors: jsonb('validation_errors').default(sql`jsonb '[]'`),
  qualityScore: integer('quality_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Requirement Traceability table
export const requirementTraceability = pgTable('requirement_traceability', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  requirementId: varchar('requirement_id', { length: 50 }).notNull(),
  requirementTitle: text('requirement_title').notNull(),
  tasks: jsonb('tasks').default(sql`jsonb '[]'`),
  apiEndpoints: jsonb('api_endpoints').default(sql`jsonb '[]'`),
  databaseTables: jsonb('database_tables').default(sql`jsonb '[]'`),
  testCases: jsonb('test_cases').default(sql`jsonb '[]'`),
  fullyImplemented: boolean('fully_implemented').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Validation Rules table
export const validationRules = pgTable('validation_rules', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  enabled: boolean('enabled').default(true),
  rule: text('rule').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Validation Reports table
export const validationReports = pgTable('validation_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  phase: varchar('phase', { length: 50 }).notNull(),
  reportName: varchar('report_name', { length: 255 }).notNull(),
  overallStatus: varchar('overall_status', { length: 20 }).notNull(),
  totalRules: integer('total_rules').notNull(),
  passedRules: integer('passed_rules').default(0),
  failedRules: integer('failed_rules').default(0),
  warningRules: integer('warning_rules').default(0),
  validationResults: jsonb('validation_results').default(sql`jsonb '[]'`),
  reportMetadata: jsonb('report_metadata').default(sql`jsonb '{}'`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Cross-Artifact Validation table
export const crossArtifactValidations = pgTable('cross_artifact_validations', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  validationType: varchar('validation_type', { length: 50 }).notNull(),
  sourceArtifactId: uuid('source_artifact_id').references(
    () => projectArtifacts.id
  ),
  targetArtifactId: uuid('target_artifact_id').references(
    () => projectArtifacts.id
  ),
  validationResult: varchar('validation_result', { length: 20 }).notNull(),
  details: jsonb('details').default(sql`jsonb '{}'`),
  affectedRequirements: jsonb('affected_requirements').default(sql`jsonb '[]'`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Project phases enum
export type ProjectPhase =
  | 'analysis'
  | 'stack_selection'
  | 'spec'
  | 'dependencies'
  | 'solutioning'
  | 'done';

// Validation status enum
export type ValidationStatus = 'pending' | 'pass' | 'warn' | 'fail';

// Stack choices enum
export type StackChoice = 'nextjs_neon_drizzle_betterauth' | 'custom';

// Validation severity enum
export type ValidationSeverity = 'error' | 'warning' | 'info';

// Validation rule types
export type ValidationRuleType =
  | 'requirement_api'
  | 'requirement_data'
  | 'requirement_task'
  | 'stack_dependency';
