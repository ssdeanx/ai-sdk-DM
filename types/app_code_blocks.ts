// Generated on 2025-05-17: TypeScript types for app_code_blocks table (AppBuilder code blocks)
import { z } from 'zod';

export const AppCodeBlockSchema = z.object({
  id: z.string().uuid(),
  app_id: z.string().uuid(),
  language: z.enum(['typescript', 'javascript', 'json']),
  code: z.string(),
  description: z.string().optional().nullable(),
  order: z.number().int().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AppCodeBlock = z.infer<typeof AppCodeBlockSchema>;
