-- Add new columns to models table
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "max_tokens" integer NOT NULL DEFAULT 4096;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "input_cost_per_token" numeric NOT NULL DEFAULT 0.0;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "output_cost_per_token" numeric NOT NULL DEFAULT 0.0;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "supports_vision" boolean NOT NULL DEFAULT false;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "supports_functions" boolean NOT NULL DEFAULT false;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "supports_streaming" boolean NOT NULL DEFAULT true;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "default_temperature" numeric NOT NULL DEFAULT 0.7;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "default_top_p" numeric NOT NULL DEFAULT 1.0;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "default_frequency_penalty" numeric NOT NULL DEFAULT 0.0;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "default_presence_penalty" numeric NOT NULL DEFAULT 0.0;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "context_window" integer NOT NULL DEFAULT 8192;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'text';
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "capabilities" jsonb NOT NULL DEFAULT '{"text": true, "vision": false, "audio": false, "functions": false, "streaming": true, "json_mode": false, "fine_tuning": false}';
ALTER TABLE "models" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
