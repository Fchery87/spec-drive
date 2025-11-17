-- Add performance indexes for critical queries
-- Generated: 2024-11-17

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Auth sessions indexes
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_expires ON auth_sessions(user_id, expires_at);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_current_phase ON projects(current_phase);
CREATE INDEX IF NOT EXISTS idx_projects_user_created ON projects(user_id, created_at DESC);

-- Project artifacts indexes
CREATE INDEX IF NOT EXISTS idx_project_artifacts_project_id ON project_artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_phase ON project_artifacts(phase);
CREATE INDEX IF NOT EXISTS idx_project_artifacts_created_at ON project_artifacts(created_at DESC);

-- Phase history indexes
CREATE INDEX IF NOT EXISTS idx_phase_history_project_id ON phase_history(project_id);
CREATE INDEX IF NOT EXISTS idx_phase_history_transitioned_at ON phase_history(transitioned_at DESC);

-- Rate limit log indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_identifier_endpoint ON rate_limit_log(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_reset_at ON rate_limit_log(reset_at);

-- Validation tables indexes
CREATE INDEX IF NOT EXISTS idx_validation_reports_project_id ON validation_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_validation_reports_created_at ON validation_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_rules_validation_id ON validation_rules(validation_id);
CREATE INDEX IF NOT EXISTS idx_cross_artifact_validations_source_target ON cross_artifact_validations(source_artifact_id, target_artifact_id);
CREATE INDEX IF NOT EXISTS idx_requirement_traceability_artifact_id ON requirement_traceability(artifact_id);

-- Comment on indexes for documentation
COMMENT ON INDEX idx_users_email IS 'Used for login and email verification lookups';
COMMENT ON INDEX idx_auth_sessions_user_id IS 'Used for finding user sessions during logout and refresh';
COMMENT ON INDEX idx_auth_sessions_expires_at IS 'Used for cleaning up expired sessions';
COMMENT ON INDEX idx_projects_user_id IS 'Used for listing user projects (most common query)';
COMMENT ON INDEX idx_projects_created_at IS 'Used for sorting projects by creation date';
COMMENT ON INDEX idx_rate_limit_log_identifier_endpoint IS 'Used for checking rate limits';
