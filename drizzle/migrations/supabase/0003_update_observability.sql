CREATE TABLE "evaluation_examples" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"evaluationId" varchar(36) NOT NULL,
	"input" text NOT NULL,
	"expectedOutput" text NOT NULL,
	"actualOutput" text NOT NULL,
	"scores" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evaluation_metrics" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"evaluationId" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"value" numeric NOT NULL,
	"threshold" numeric NOT NULL,
	"weight" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"traceId" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "model_costs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"modelId" varchar(36) NOT NULL,
	"provider" text NOT NULL,
	"displayName" text NOT NULL,
	"costPerInputToken" numeric NOT NULL,
	"costPerOutputToken" numeric NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"cost" numeric NOT NULL,
	"inputTokens" integer NOT NULL,
	"outputTokens" integer NOT NULL,
	"requests" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "model_evaluations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"modelId" varchar(36) NOT NULL,
	"provider" text NOT NULL,
	"displayName" text NOT NULL,
	"version" text NOT NULL,
	"evaluationDate" timestamp with time zone NOT NULL,
	"datasetName" text NOT NULL,
	"datasetSize" integer NOT NULL,
	"overallScore" numeric NOT NULL,
	"previousScore" numeric,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "model_performance" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"modelId" varchar(36) NOT NULL,
	"provider" text NOT NULL,
	"displayName" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"latency_ms" numeric NOT NULL,
	"tokens_per_second" numeric NOT NULL,
	"success_rate" numeric NOT NULL,
	"request_count" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"error_count" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "spans" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"traceId" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"startTime" timestamp with time zone NOT NULL,
	"endTime" timestamp with time zone NOT NULL,
	"duration" numeric NOT NULL,
	"status" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_metrics" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"timeRange" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"cpu_usage" numeric NOT NULL,
	"memory_usage" numeric NOT NULL,
	"database_connections" integer NOT NULL,
	"api_requests_per_minute" integer NOT NULL,
	"average_response_time_ms" numeric NOT NULL,
	"active_users" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "traces" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"startTime" timestamp with time zone NOT NULL,
	"endTime" timestamp with time zone NOT NULL,
	"duration" numeric NOT NULL,
	"status" text NOT NULL,
	"userId" varchar(36) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "evaluation_examples" ADD CONSTRAINT "evaluation_examples_evaluationId_model_evaluations_id_fk" FOREIGN KEY ("evaluationId") REFERENCES "public"."model_evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_metrics" ADD CONSTRAINT "evaluation_metrics_evaluationId_model_evaluations_id_fk" FOREIGN KEY ("evaluationId") REFERENCES "public"."model_evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_traceId_traces_id_fk" FOREIGN KEY ("traceId") REFERENCES "public"."traces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_costs" ADD CONSTRAINT "model_costs_modelId_models_id_fk" FOREIGN KEY ("modelId") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_evaluations" ADD CONSTRAINT "model_evaluations_modelId_models_id_fk" FOREIGN KEY ("modelId") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_performance" ADD CONSTRAINT "model_performance_modelId_models_id_fk" FOREIGN KEY ("modelId") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spans" ADD CONSTRAINT "spans_traceId_traces_id_fk" FOREIGN KEY ("traceId") REFERENCES "public"."traces"("id") ON DELETE cascade ON UPDATE no action;