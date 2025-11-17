CREATE TABLE IF NOT EXISTS "cross_artifact_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"validation_type" varchar(50) NOT NULL,
	"source_artifact_id" uuid,
	"target_artifact_id" uuid,
	"validation_result" varchar(20) NOT NULL,
	"details" jsonb DEFAULT jsonb '{}',
	"affected_requirements" jsonb DEFAULT jsonb '[]',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "phase_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"from_phase" varchar(50),
	"to_phase" varchar(50) NOT NULL,
	"artifacts_generated" jsonb DEFAULT jsonb '[]',
	"validation_passed" boolean DEFAULT true,
	"tokens_used" integer,
	"cost_estimate_usd" integer,
	"transitioned_by" uuid,
	"transition_date" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"phase" varchar(50) NOT NULL,
	"artifact_name" varchar(255) NOT NULL,
	"version" varchar(50) DEFAULT '1.0.0',
	"file_path" text,
	"file_size" integer,
	"content_hash" varchar(255),
	"frontmatter" jsonb,
	"content" text,
	"validation_status" varchar(20) DEFAULT 'pending',
	"validation_errors" jsonb DEFAULT jsonb '[]',
	"quality_score" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"idea" text NOT NULL,
	"current_phase" varchar(50) DEFAULT 'analysis' NOT NULL,
	"phases_completed" jsonb DEFAULT jsonb '[]',
	"stack_choice" varchar(255),
	"stack_approved" boolean DEFAULT false,
	"dependencies_approved" boolean DEFAULT false,
	"github_repo_url" varchar(500),
	"orchestration_state" jsonb DEFAULT jsonb '{}',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "requirement_traceability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"requirement_id" varchar(50) NOT NULL,
	"requirement_title" text NOT NULL,
	"tasks" jsonb DEFAULT jsonb '[]',
	"api_endpoints" jsonb DEFAULT jsonb '[]',
	"database_tables" jsonb DEFAULT jsonb '[]',
	"test_cases" jsonb DEFAULT jsonb '[]',
	"fully_implemented" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "validation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"phase" varchar(50) NOT NULL,
	"report_name" varchar(255) NOT NULL,
	"overall_status" varchar(20) NOT NULL,
	"total_rules" integer NOT NULL,
	"passed_rules" integer DEFAULT 0,
	"failed_rules" integer DEFAULT 0,
	"warning_rules" integer DEFAULT 0,
	"validation_results" jsonb DEFAULT jsonb '[]',
	"report_metadata" jsonb DEFAULT jsonb '{}',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "validation_rules" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"enabled" boolean DEFAULT true,
	"rule" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_artifact_validations" ADD CONSTRAINT "cross_artifact_validations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_artifact_validations" ADD CONSTRAINT "cross_artifact_validations_source_artifact_id_project_artifacts_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."project_artifacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_artifact_validations" ADD CONSTRAINT "cross_artifact_validations_target_artifact_id_project_artifacts_id_fk" FOREIGN KEY ("target_artifact_id") REFERENCES "public"."project_artifacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "phase_history" ADD CONSTRAINT "phase_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_artifacts" ADD CONSTRAINT "project_artifacts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requirement_traceability" ADD CONSTRAINT "requirement_traceability_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "validation_reports" ADD CONSTRAINT "validation_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
