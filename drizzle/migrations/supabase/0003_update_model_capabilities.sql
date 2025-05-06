-- Update the default capabilities JSON to include all fields from ModelCapabilities interface
ALTER TABLE "models" ALTER COLUMN "capabilities" SET DEFAULT '{"text": true, "vision": false, "audio": false, "video": false, "functions": false, "streaming": true, "json_mode": false, "fine_tuning": false, "thinking": false, "search_grounding": false, "code_execution": false, "structured_output": false, "image_generation": false, "video_generation": false, "audio_generation": false}'::jsonb;

-- Update existing records to include the new capability fields
UPDATE "models" 
SET "capabilities" = "capabilities" || 
  '{"video": false, "thinking": false, "search_grounding": false, "code_execution": false, "structured_output": false, "image_generation": false, "video_generation": false, "audio_generation": false}'::jsonb
WHERE TRUE;
