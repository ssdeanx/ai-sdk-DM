import { tool, type Tool } from 'ai';
import { z } from 'zod';
import * as webTools from './tools/web-tools';
import * as codeTools from './tools/code-tools';
import * as dataTools from './tools/data-tools';
import * as fileTools from './tools/file-tools';
import * as apiTools from './tools/api-tools';
import * as ragTools from './tools/rag-tools';
import { getLibSQLClient } from './memory/db';

// Export all tool modules
export { webTools, codeTools, dataTools, fileTools, apiTools, ragTools };

// Tool categories
export const toolCategories = [
  {
    id: 'web',
    name: 'Web Tools',
    description: 'Tools for interacting with the web',
  },
  {
    id: 'code',
    name: 'Code Tools',
    description: 'Tools for code execution and analysis',
  },
  {
    id: 'data',
    name: 'Data Tools',
    description: 'Tools for data processing and analysis',
  },
  {
    id: 'file',
    name: 'File Tools',
    description: 'Tools for file system operations',
  },
  { id: 'api', name: 'API Tools', description: 'Tools for API interactions' },
  {
    id: 'rag',
    name: 'RAG Tools',
    description: 'Tools for retrieval-augmented generation',
  },
  {
    id: 'custom',
    name: 'Custom Tools',
    description: 'User-defined custom tools',
  },
];

// Get all built-in tools
export function getAllBuiltInTools() {
  return {
    ...webTools.tools,
    ...codeTools.tools,
    ...dataTools.tools,
    ...fileTools.tools,
    ...apiTools.tools,
    ...ragTools.tools,
  };
}

// Load custom tools from database
export async function loadCustomTools() {
  try {
    const db = getLibSQLClient();

    const result = await db.execute({
      sql: `
        SELECT t.*, a.code as implementation
        FROM tools t
        LEFT JOIN apps a ON t.name = a.name AND a.type = 'tool'
        WHERE t.type = 'custom'
      `,
    });

    const customTools: Record<string, Tool<any, any>> = {};

    for (const row of result.rows) {
      try {
        const name = row.name as string;
        const description = row.description as string;
        const parametersSchema = JSON.parse(row.parameters_schema as string);
        const implementation = row.implementation as string;

        // Convert JSON schema to Zod schema
        const zodSchema = jsonSchemaToZod(parametersSchema);

        // Create a safe execution environment for the custom tool
        // This is a simplified approach - in production, you would want more security
        const executeTool = new Function('params', implementation);

        customTools[name] = tool({
          description,
          parameters: zodSchema,
          execute: async (params) => {
            try {
              return await executeTool(params);
            } catch (error) {
              console.error(`Error executing custom tool ${name}:`, error);
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              return { error: `Tool execution failed: ${errorMessage}` };
            }
          },
        });
      } catch (error) {
        console.error(`Error loading custom tool ${row.name}:`, error);
      }
    }

    return customTools;
  } catch (error) {
    console.error('Error loading custom tools:', error);
    return {};
  }
}

// Helper to convert JSON schema to Zod schema
export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Invalid schema');
  }

  if (schema.type === 'object') {
    const shape: Record<string, z.ZodTypeAny> = {};

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        let zodProp = jsonSchemaToZod(prop as any);

        // Make  {
        // Make property optional if not in required array
        if (schema.required && !schema.required.includes(key)) {
          zodProp = zodProp.optional();
        }

        shape[key] = zodProp;
      }
    }

    return z.object(shape);
  } else if (schema.type === 'string') {
    let zodString = z.string();

    if (schema.enum) {
      return z.enum(schema.enum as [string, ...string[]]);
    }

    if (schema.description) {
      zodString = zodString.describe(schema.description);
    }

    return zodString;
  } else if (schema.type === 'number' || schema.type === 'integer') {
    return z.number();
  } else if (schema.type === 'boolean') {
    return z.boolean();
  } else if (schema.type === 'array') {
    if (schema.items) {
      return z.array(jsonSchemaToZod(schema.items));
    }
    return z.array(z.any());
  }

  return z.any();
}
