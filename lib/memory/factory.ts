/**
 * Memory Factory
 * 
 * This module provides a factory for creating memory instances based on the configured provider.
 * It supports LibSQL, Upstash, and potentially other memory providers.
 */

import { isDatabaseAvailable as isLibSQLAvailable } from './db'
import { isUpstashAvailable } from './upstash/memoryStore'
import * as LibSQLMemory from './memory'
import * as UpstashMemory from './upstash/memoryStore'

// Memory provider types
export type MemoryProvider = 'libsql' | 'upstash'

// Memory interface
export interface MemoryInterface {
  // Thread operations
  createMemoryThread: (name: string, options?: any) => Promise<string>
  getMemoryThread: (id: string) => Promise<any>
  listMemoryThreads: (options?: any) => Promise<any[]>
  deleteMemoryThread: (id: string) => Promise<boolean>
  
  // Message operations
  saveMessage: (threadId: string, role: 'user' | 'assistant' | 'system' | 'tool', content: string, options?: any) => Promise<string>
  loadMessages: (threadId: string, limit?: number) => Promise<any[]>
  
  // Embedding operations
  generateEmbedding?: (text: string, modelName?: string) => Promise<Float32Array>
  saveEmbedding?: (vector: Float32Array, model?: string) => Promise<string>
  semanticSearchMemory?: (query: string, options?: any) => Promise<any[]>
  
  // State operations
  saveAgentState?: (threadId: string, agentId: string, state: any) => Promise<void>
  loadAgentState?: (threadId: string, agentId: string) => Promise<any>
}

// Get the configured memory provider
export function getMemoryProvider(): MemoryProvider {
  return (process.env.MEMORY_PROVIDER as MemoryProvider) || 'libsql'
}

// Check if the configured memory provider is available
export async function isMemoryAvailable(): Promise<boolean> {
  const provider = getMemoryProvider()
  
  switch (provider) {
    case 'libsql':
      return await isLibSQLAvailable()
    case 'upstash':
      return await isUpstashAvailable()
    default:
      return false
  }
}

// Create a memory instance based on the configured provider
export function createMemory(): MemoryInterface {
  const provider = getMemoryProvider()
  
  switch (provider) {
    case 'libsql':
      return {
        createMemoryThread: LibSQLMemory.createMemoryThread,
        getMemoryThread: LibSQLMemory.getMemoryThread,
        listMemoryThreads: LibSQLMemory.listMemoryThreads,
        deleteMemoryThread: LibSQLMemory.deleteMemoryThread,
        saveMessage: LibSQLMemory.saveMessage,
        loadMessages: LibSQLMemory.loadMessages,
        generateEmbedding: LibSQLMemory.generateEmbedding,
        saveEmbedding: LibSQLMemory.saveEmbedding,
        semanticSearchMemory: LibSQLMemory.semanticSearchMemory,
        saveAgentState: LibSQLMemory.saveAgentState,
        loadAgentState: LibSQLMemory.loadAgentState,
      }
    case 'upstash':
      return {
        createMemoryThread: (name, options) => UpstashMemory.createThread(name, options?.metadata),
        getMemoryThread: UpstashMemory.getThread,
        listMemoryThreads: (options) => UpstashMemory.listThreads(options?.limit, options?.offset),
        deleteMemoryThread: UpstashMemory.deleteThread,
        saveMessage: (threadId, role, content, options) => 
          UpstashMemory.saveMessage(threadId, { role, content, metadata: options?.metadata }),
        loadMessages: (threadId) => UpstashMemory.getMessages(threadId),
      }
    default:
      throw new Error(`Unsupported memory provider: ${provider}`)
  }
}

// Export a singleton memory instance
export const memory = createMemory()
