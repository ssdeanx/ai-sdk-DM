import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';

/**
 * Zod schemas for PersonaProfileDO operations
 */
const PersonaProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['user', 'agent', 'assistant']),
  description: z.string().optional(),
  avatar: z.string().optional(),
  config: z
    .object({
      model: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      systemPrompt: z.string().optional(),
      tools: z.array(z.string()).optional(),
    })
    .optional(),
  preferences: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

type PersonaProfile = z.infer<typeof PersonaProfileSchema>;

/**
 * PersonaProfileDO
 *
 * Durable Object for managing persona profile state and data.
 * Handles agent configurations, user preferences, and persona settings.
 */
export class PersonaProfileDO extends DurableObject {
  private profileId: string;
  private profile: PersonaProfile | null = null;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.profileId = this.ctx.id.toString();
  }

  /**
   * Handle fetch requests to the DO.
   * @param request - Incoming request
   * @returns Response
   */
  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const method = request.method;
      const path = url.pathname;

      switch (method) {
        case 'GET':
          if (path === '/profile') {
            return await this.handleGetProfile();
          }
          if (path === '/config') {
            return await this.handleGetConfig();
          }
          break;

        case 'POST':
          if (path === '/profile') {
            return await this.handleCreateProfile(request);
          }
          break;

        case 'PUT':
          if (path === '/profile') {
            return await this.handleUpdateProfile(request);
          }
          if (path === '/config') {
            return await this.handleUpdateConfig(request);
          }
          if (path === '/preferences') {
            return await this.handleUpdatePreferences(request);
          }
          break;

        case 'DELETE':
          if (path === '/profile') {
            return await this.handleDeleteProfile();
          }
          break;
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response(`Internal Server Error: ${error}`, { status: 500 });
    }
  }

  /**
   * Get persona profile data.
   */
  async getProfile(): Promise<PersonaProfile | null> {
    if (!this.profile) {
      const storedProfile = await this.ctx.storage.get('profile');
      if (storedProfile) {
        try {
          this.profile = PersonaProfileSchema.parse(storedProfile);
        } catch {
          // If stored data is invalid, set to null
          this.profile = null;
        }
      } else {
        this.profile = null;
      }
    }
    return this.profile;
  }

  /**
   * Create a new persona profile.
   * @param data - Profile creation data
   */
  async createProfile(data: unknown): Promise<PersonaProfile> {
    const profileData = data as Record<string, unknown>;
    const now = Date.now();

    const validatedProfile = PersonaProfileSchema.parse({
      id: this.profileId,
      ...profileData,
      createdAt: now,
      updatedAt: now,
    });

    this.profile = validatedProfile;
    await this.ctx.storage.put('profile', this.profile);
    return this.profile;
  }

  /**
   * Update persona profile data.
   * @param data - Profile update data
   */
  async updateProfile(data: unknown): Promise<PersonaProfile> {
    const currentProfile = await this.getProfile();
    if (!currentProfile) {
      throw new Error('Profile not found');
    }

    const updateData = data as Record<string, unknown>;
    const updatedProfile = PersonaProfileSchema.parse({
      ...currentProfile,
      ...updateData,
      id: this.profileId,
      updatedAt: Date.now(),
    });

    this.profile = updatedProfile;
    await this.ctx.storage.put('profile', this.profile);
    return this.profile;
  }

  /**
   * Update persona configuration.
   * @param config - Configuration data
   */
  async updateConfig(config: unknown): Promise<PersonaProfile> {
    const currentProfile = await this.getProfile();
    if (!currentProfile) {
      throw new Error('Profile not found');
    }

    const configData = config as Record<string, unknown>;
    return await this.updateProfile({
      config: { ...(currentProfile.config || {}), ...configData },
    });
  }

  /**
   * Update persona preferences.
   * @param preferences - Preferences data
   */
  async updatePreferences(preferences: unknown): Promise<PersonaProfile> {
    const currentProfile = await this.getProfile();
    if (!currentProfile) {
      throw new Error('Profile not found');
    }

    const preferencesData = preferences as Record<string, unknown>;
    return await this.updateProfile({
      preferences: {
        ...(currentProfile.preferences || {}),
        ...preferencesData,
      },
    });
  }

  /**
   * Delete the persona profile.
   */
  async deleteProfile(): Promise<void> {
    this.profile = null;
    await this.ctx.storage.delete('profile');
  }

  /**
   * Get persona configuration only.
   */
  async getConfig(): Promise<PersonaProfile['config'] | null> {
    const profile = await this.getProfile();
    return profile?.config || null;
  }

  // HTTP handlers for fetch requests
  private async handleGetProfile(): Promise<Response> {
    const profile = await this.getProfile();
    return new Response(JSON.stringify(profile), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleCreateProfile(request: Request): Promise<Response> {
    const profileData = await request.json();
    const profile = await this.createProfile(profileData);
    return new Response(JSON.stringify(profile), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleUpdateProfile(request: Request): Promise<Response> {
    const updateData = await request.json();
    const profile = await this.updateProfile(updateData);
    return new Response(JSON.stringify(profile), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleUpdateConfig(request: Request): Promise<Response> {
    const configData = await request.json();
    const profile = await this.updateConfig(configData);
    return new Response(JSON.stringify(profile), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleUpdatePreferences(request: Request): Promise<Response> {
    const preferencesData = await request.json();
    const profile = await this.updatePreferences(preferencesData);
    return new Response(JSON.stringify(profile), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleDeleteProfile(): Promise<Response> {
    await this.deleteProfile();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetConfig(): Promise<Response> {
    const config = await this.getConfig();
    return new Response(JSON.stringify(config), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
