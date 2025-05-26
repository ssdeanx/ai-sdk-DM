import { DurableObject } from 'cloudflare:workers';
import { generateId } from 'ai';
import {
  ChatMessageSchema,
  type ChatMessage,
  AgentStateSchema,
  type AgentState,
} from './schema';

/**
 * AgentThreadDO
 *
 * Durable Object for managing agent thread state and message history.
 * Provides persistent storage for Vercel AI SDK chat threads and AIState.
 */
export class AgentThreadDO extends DurableObject {
  private threadId: string;
  private messages: ChatMessage[] = [];
  private aiState: AgentState | null = null;

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.threadId = this.ctx.id.toString();
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
        case 'POST':
          if (path === '/messages') {
            return await this.handleAddMessage(request);
          }
          if (path === '/ai-state') {
            return await this.handleSaveAIState(request);
          }
          break;

        case 'GET':
          if (path === '/messages') {
            return await this.handleGetMessages();
          }
          if (path === '/ai-state') {
            return await this.handleLoadAIState();
          }
          if (path === '/thread') {
            return await this.handleGetThread();
          }
          break;

        case 'DELETE':
          if (path === '/messages') {
            return await this.handleClearMessages();
          }
          break;
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response(`Internal Server Error: ${error}`, { status: 500 });
    }
  }

  /**
   * Add a message to the thread.
   * @param message - Message data
   */
  async addMessage(message: unknown): Promise<void> {
    const messageObj =
      typeof message === 'object' && message !== null
        ? (message as Record<string, unknown>)
        : {};
    const validatedMessage = ChatMessageSchema.parse({
      ...messageObj,
      id: typeof messageObj.id === 'string' ? messageObj.id : generateId(),
      threadId: this.threadId,
    });

    this.messages.push(validatedMessage);
    await this.ctx.storage.put('messages', this.messages);
  }

  /**
   * Get message history for the thread.
   */
  async getMessages(): Promise<ChatMessage[]> {
    if (this.messages.length === 0) {
      const stored = await this.ctx.storage.get('messages');
      if (stored) this.messages = stored as ChatMessage[];
    }
    return this.messages;
  }

  /**
   * Clear all messages from the thread.
   */
  async clearMessages(): Promise<void> {
    this.messages = [];
    await this.ctx.storage.put('messages', this.messages);
  }

  /**
   * Manage Vercel AI SDK AIState persistence.
   * @param state - AIState data
   */
  async saveAIState(state: unknown): Promise<void> {
    const stateObj =
      typeof state === 'object' && state !== null
        ? (state as Record<string, unknown>)
        : {};
    const validatedState = AgentStateSchema.parse({
      ...stateObj,
      memoryThreadId: this.threadId,
    });

    this.aiState = validatedState;
    await this.ctx.storage.put('aiState', this.aiState);
  }

  /**
   * Load Vercel AI SDK AIState.
   */
  async loadAIState(): Promise<AgentState | null> {
    if (!this.aiState) {
      const stored = await this.ctx.storage.get('aiState');
      if (stored) this.aiState = AgentStateSchema.parse(stored);
    }
    return this.aiState;
  }

  /**
   * Get thread metadata and summary.
   */
  async getThread(): Promise<{
    id: string;
    messageCount: number;
    lastMessage?: ChatMessage;
    aiState?: AgentState;
  }> {
    const messages = await this.getMessages();
    const aiState = await this.loadAIState();

    return {
      id: this.threadId,
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1],
      aiState: aiState || undefined,
    };
  }

  // HTTP handlers for fetch requests
  private async handleAddMessage(request: Request): Promise<Response> {
    const messageData = await request.json();
    await this.addMessage(messageData);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetMessages(): Promise<Response> {
    const messages = await this.getMessages();
    return new Response(JSON.stringify(messages), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleClearMessages(): Promise<Response> {
    await this.clearMessages();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleSaveAIState(request: Request): Promise<Response> {
    const stateData = await request.json();
    await this.saveAIState(stateData);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleLoadAIState(): Promise<Response> {
    const aiState = await this.loadAIState();
    return new Response(JSON.stringify(aiState), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetThread(): Promise<Response> {
    const thread = await this.getThread();
    return new Response(JSON.stringify(thread), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
