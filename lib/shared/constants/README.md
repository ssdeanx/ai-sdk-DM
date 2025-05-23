# Shared Constants Library

The `lib/shared/constants` directory contains application-wide constants, configuration values, and enumerations that are used across both frontend and backend parts of the application. These constants provide a single source of truth for fixed values throughout the codebase.

## Purpose

Centralizing constants in a shared library offers several benefits:

1. **Consistency**: Ensures the same values are used throughout the application
2. **Maintainability**: Makes updates easier by changing values in a single location
3. **Type Safety**: Provides TypeScript enums and const assertions for type checking
4. **Documentation**: Self-documents important application values
5. **Prevents Magic Values**: Eliminates hard-coded "magic" values in the codebase

## Organization

The constants directory is organized by domain and purpose:

```bash
lib/shared/constants/
├── api/                  # API-related constants
│   ├── endpoints.ts      # API endpoint paths
│   ├── headers.ts        # HTTP header constants
│   ├── statusCodes.ts    # HTTP status codes
│   └── index.ts          # Barrel exports
├── app/                  # Application-specific constants
│   ├── routes.ts         # Application routes
│   ├── features.ts       # Feature flags
│   ├── limits.ts         # Application limits
│   └── index.ts          # Barrel exports
├── ui/                   # UI-related constants
│   ├── colors.ts         # Color constants
│   ├── breakpoints.ts    # Responsive breakpoints
│   ├── animations.ts     # Animation constants
│   └── index.ts          # Barrel exports
├── ai/                   # AI-related constants
│   ├── models.ts         # AI model constants
│   ├── providers.ts      # AI provider constants
│   ├── prompts.ts        # Common prompt templates
│   └── index.ts          # Barrel exports
├── db/                   # Database-related constants
│   ├── tables.ts         # Table names
│   ├── fields.ts         # Field names
│   ├── queries.ts        # Common query constants
│   └── index.ts          # Barrel exports
├── time/                 # Time-related constants
│   ├── durations.ts      # Time durations
│   ├── formats.ts        # Date/time formats
│   └── index.ts          # Barrel exports
├── regex/                # Regular expression patterns
├── errors/               # Error codes and messages
├── config/               # Environment-specific configuration
└── index.ts              # Main barrel export file
```

## Best Practices

### Constant Definition

1. **Use TypeScript Features**: Leverage TypeScript's type system for constants.

   ```typescript
   // Using enums for related constants
   export enum HttpStatus {
     OK = 200,
     CREATED = 201,
     BAD_REQUEST = 400,
     UNAUTHORIZED = 401,
     FORBIDDEN = 403,
     NOT_FOUND = 404,
     INTERNAL_SERVER_ERROR = 500,
   }
   
   // Using const assertions for arrays and objects
   export const SUPPORTED_LANGUAGES = [
     'en', 'es', 'fr', 'de', 'ja', 'zh'
   ] as const;
   
   export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
   
   // Using objects with const assertions
   export const API_ENDPOINTS = {
     AUTH: {
       LOGIN: '/api/auth/login',
       LOGOUT: '/api/auth/logout',
       REGISTER: '/api/auth/register',
       REFRESH: '/api/auth/refresh',
     },
     USERS: {
       GET: '/api/users',
       CREATE: '/api/users',
       UPDATE: (id: string) => `/api/users/${id}`,
       DELETE: (id: string) => `/api/users/${id}`,
     },
   } as const;
   ```

2. **Naming Conventions**: Use clear, descriptive names with appropriate casing.

   ```typescript
   // For simple constants, use UPPER_SNAKE_CASE
   export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
   export const DEFAULT_PAGINATION_LIMIT = 20;
   
   // For enum-like objects, use PascalCase for the object and UPPER_SNAKE_CASE for properties
   export const ErrorCode = {
     INVALID_INPUT: 'INVALID_INPUT',
     UNAUTHORIZED: 'UNAUTHORIZED',
     RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
     INTERNAL_ERROR: 'INTERNAL_ERROR',
   } as const;
   
   // For configuration objects, use camelCase
   export const apiConfig = {
     baseUrl: process.env.API_BASE_URL || 'https://api.example.com',
     timeout: 30000,
     retryAttempts: 3,
   };
   ```

3. **Documentation**: Add JSDoc comments to explain the purpose and usage of constants.

   ```typescript
   /**
    * Maximum number of items that can be returned in a single API request.
    * This limit helps prevent excessive database load and response size.
    * 
    * @see API_ENDPOINTS.ITEMS.LIST for the endpoint that uses this constant
    */
   export const MAX_ITEMS_PER_REQUEST = 100;
   
   /**
    * Supported file types for document uploads.
    * Adding new types requires updates to the file processing service.
    */
   export const ALLOWED_DOCUMENT_TYPES = [
     'application/pdf',
     'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'text/plain',
   ] as const;
   ```

4. **Grouping Related Constants**: Group related constants together in the same file.

   ```typescript
   // time/durations.ts
   export const DURATIONS = {
     MILLISECOND: 1,
     SECOND: 1000,
     MINUTE: 60 * 1000,
     HOUR: 60 * 60 * 1000,
     DAY: 24 * 60 * 60 * 1000,
     WEEK: 7 * 24 * 60 * 60 * 1000,
     MONTH_30: 30 * 24 * 60 * 60 * 1000,
   } as const;
   
   export const TIMEOUTS = {
     API_REQUEST: 30 * 1000, // 30 seconds
     AUTHENTICATION: 5 * 60 * 1000, // 5 minutes
     SESSION: 24 * 60 * 60 * 1000, // 24 hours
     CACHE: 7 * 24 * 60 * 60 * 1000, // 7 days
   } as const;
   ```

### Environment-Specific Constants

1. **Configuration Factory**: Use factory functions for environment-specific constants.

   ```typescript
   // config/appConfig.ts
   import { z } from 'zod';
   
   const AppConfigSchema = z.object({
     environment: z.enum(['development', 'test', 'staging', 'production']),
     apiUrl: z.string().url(),
     maxUploadSize: z.number().positive(),
     featureFlags: z.object({
       newUserOnboarding: z.boolean(),
       advancedAnalytics: z.boolean(),
       betaFeatures: z.boolean(),
     }),
   });
   
   export type AppConfig = z.infer<typeof AppConfigSchema>;
   
   export function createAppConfig(): AppConfig {
     const config = {
       environment: process.env.NODE_ENV || 'development',
       apiUrl: process.env.API_URL || 'http://localhost:3000/api',
       maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10),
       featureFlags: {
         newUserOnboarding: process.env.FEATURE_NEW_ONBOARDING === 'true',
         advancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true',
         betaFeatures: process.env.FEATURE_BETA === 'true',
       },
     };
     
     // Validate the config
     return AppConfigSchema.parse(config);
   }
   
   // Export a singleton instance
   export const appConfig = createAppConfig();
   ```

2. **Feature Flags**: Use constants for feature flags.

   ```typescript
   // app/features.ts
   export const FEATURES = {
     NEW_DASHBOARD: process.env.NEXT_PUBLIC_FEATURE_NEW_DASHBOARD === 'true',
     AI_SUGGESTIONS: process.env.NEXT_PUBLIC_FEATURE_AI_SUGGESTIONS === 'true',
     ADVANCED_SEARCH: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_SEARCH === 'true',
   } as const;
   
   // Usage
   import { FEATURES } from '@/lib/shared/constants/app/features';
   
   function MyComponent() {
     return (
       <div>
         {FEATURES.NEW_DASHBOARD && <NewDashboard />}
         {!FEATURES.NEW_DASHBOARD && <LegacyDashboard />}
       </div>
     );
   }
   ```

### Type Safety

1. **Derive Types from Constants**: Create TypeScript types from constant values.

   ```typescript
   // ai/models.ts
   export const AI_MODELS = {
     GPT_4: 'gpt-4',
     GPT_4_TURBO: 'gpt-4-turbo',
     GPT_3_5_TURBO: 'gpt-3.5-turbo',
     CLAUDE_3_OPUS: 'claude-3-opus',
     CLAUDE_3_SONNET: 'claude-3-sonnet',
     GEMINI_PRO: 'gemini-pro',
     GEMINI_ULTRA: 'gemini-ultra',
   } as const;
   
   export type AIModel = typeof AI_MODELS[keyof typeof AI_MODELS];
   
   // This ensures only valid model values can be used
   export function isValidModel(model: string): model is AIModel {
     return Object.values(AI_MODELS).includes(model as AIModel);
   }
   ```

2. **Union Types for Enums**: Create union types for enum-like constants.

   ```typescript
   // app/permissions.ts
   export const PERMISSION = {
     READ: 'read',
     WRITE: 'write',
     DELETE: 'delete',
     ADMIN: 'admin',
   } as const;
   
   export type Permission = typeof PERMISSION[keyof typeof PERMISSION];
   
   // Type-safe function that only accepts valid permissions
   export function hasPermission(
     userPermissions: Permission[], 
     requiredPermission: Permission
   ): boolean {
     return userPermissions.includes(requiredPermission);
   }
   ```

## Common Constant Categories

### API Constants

```typescript
// api/endpoints.ts
export const API_VERSION = 'v1';
export const API_BASE_URL = `/api/${API_VERSION}`;

export const ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
  },
  USERS: {
    BASE: `${API_BASE_URL}/users`,
    DETAIL: (id: string) => `${API_BASE_URL}/users/${id}`,
    PROFILE: `${API_BASE_URL}/users/profile`,
  },
  // ...other endpoints
} as const;

// api/headers.ts
export const HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  ACCEPT: 'Accept',
  CACHE_CONTROL: 'Cache-Control',
  X_API_KEY: 'X-API-Key',
} as const;

export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
  TEXT: 'text/plain',
} as const;
```

### Application Constants

```typescript
// app/routes.ts
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
  },
  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    SETTINGS: '/admin/settings',
  },
} as const;

// app/limits.ts
export const LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_UPLOAD: 5,
  MAX_ITEMS_PER_PAGE: 100,
  DEFAULT_ITEMS_PER_PAGE: 20,
  MAX_SEARCH_RESULTS: 500,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
} as const;
```

### AI Constants

```typescript
// ai/models.ts
export const AI_MODELS = {
  GPT_4: 'gpt-4',
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
  CLAUDE_3_OPUS: 'claude-3-opus',
  CLAUDE_3_SONNET: 'claude-3-sonnet',
  GEMINI_PRO: 'gemini-pro',
  GEMINI_ULTRA: 'gemini-ultra',
} as const;

export type AIModel = typeof AI_MODELS[keyof typeof AI_MODELS];

export const MODEL_CONTEXT_WINDOWS = {
  [AI_MODELS.GPT_4]: 8192,
  [AI_MODELS.GPT_4_TURBO]: 128000,
  [AI_MODELS.GPT_3_5_TURBO]: 16385,
  [AI_MODELS.CLAUDE_3_OPUS]: 200000,
  [AI_MODELS.CLAUDE_3_SONNET]: 180000,
  [AI_MODELS.GEMINI_PRO]: 32768,
  [AI_MODELS.GEMINI_ULTRA]: 1048576,
} as const;

// ai/prompts.ts
export const SYSTEM_PROMPTS = {
  GENERAL_ASSISTANT: `You are a helpful AI assistant that provides accurate, concise information.`,
  CODE_ASSISTANT: `You are a coding assistant that helps with programming questions, debugging, and best practices.`,
  CREATIVE_WRITER: `You are a creative writing assistant that helps with storytelling, character development, and creative content.`,
} as const;
```

### Error Constants

````typescript
// errors/codes.ts
export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials',
  AUTH_TOKEN_EXPIRED: 'auth/token-expired',
  AUTH_INSUFFICIENT_PERMISSIONS: 'auth/insufficient-permissions',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'resource/not-found',
  RESOURCE_ALREADY_EXISTS: 'resource/already-exists',
  RESOURCE_CONFLICT: 'resource/conflict',
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'validation/required-field',
  VALIDATION_INVALID_FORMAT: 'validation/invalid-format',
````
