CREATE TABLE IF NOT EXISTS "workflows" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "current_step_index" integer DEFAULT 0 NOT NULL,
  "status" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "workflow_steps" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "workflow_id" varchar(36) NOT NULL,
  "agent_id" varchar(36) NOT NULL,
  "input" text,
  "thread_id" varchar(36) NOT NULL,
  "status" text NOT NULL,
  "result" text,
  "error" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_fkey" 
FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX "workflow_steps_workflow_id_idx" ON "workflow_steps" ("workflow_id");
CREATE INDEX "workflows_status_idx" ON "workflows" ("status");
CREATE INDEX "workflows_updated_at_idx" ON "workflows" ("updated_at");
