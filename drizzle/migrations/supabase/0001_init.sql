CREATE TABLE "workflow_steps" (
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
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "max_tokens" integer DEFAULT 4096 NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "input_cost_per_token" numeric DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "output_cost_per_token" numeric DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "supports_vision" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "supports_functions" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "supports_streaming" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "default_temperature" numeric DEFAULT '0.7' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "default_top_p" numeric DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "default_frequency_penalty" numeric DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "default_presence_penalty" numeric DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "context_window" integer DEFAULT 8192 NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "category" text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "capabilities" jsonb DEFAULT '{"text":true,"vision":false,"audio":false,"functions":false,"streaming":true,"json_mode":false,"fine_tuning":false}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "metadata" jsonb;