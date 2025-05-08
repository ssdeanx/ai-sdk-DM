
'use client';

import { useState, useRef, useEffect } from 'react';
// Import from the AI SDK
import { useChat } from '@ai-sdk/react';
import type { Message, CreateMessage } from '@ai-sdk/react';
import {
  Bot, User, Send, Loader2, RefreshCw, XCircle, Paperclip,
  FileText, Code, Mic, Copy, Check, Eraser,
  Maximize2, Minimize2, ThumbsUp, ThumbsDown,
  Zap, Settings, MessageSquare, Image as ImageIcon,
  Terminal, BarChart, Table, Globe, Monitor,
  MapPin, FormInput, ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
// Import components
import { ChatSidebar } from './chat-sidebar';
import { ImageDisplay } from './image-display';
import { AIImageGenerator } from './ai-image-generator';
import { ComputerUse } from './computer-use';
import { DataVisualization } from './data-visualization';
import { VisualizationWithTracing } from './visualization-with-tracing';
import { DataTable } from './data-table';
import { BrowserDisplay } from './browser-display';
import { ScreenShare } from './screen-share';
import { InteractiveMap } from './interactive-map';
import { InteractiveForm } from './interactive-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CodeBlock } from './code-block';
import { MermaidDiagram } from './mermaid-diagram';
import { nanoid } from 'nanoid';

interface AiSdkChatProps {
  apiEndpoint?: string;
  initialMessages?: Message[];
  initialThreadId?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  className?: string;
  provider?: string;
  systemPrompt?: string;
  personaId?: string;
  streamProtocol?: 'text' | 'data';
  toolChoice?: 'auto' | 'none' | string;
  maxSteps?: number;
  middleware?: {
    caching?: {
      enabled?: boolean
      ttl?: number
      maxSize?: number
    }
    reasoning?: {
      enabled?: boolean
      tagName?: string
      startWithReasoning?: boolean
    }
    simulation?: {
      enabled?: boolean
    }
    logging?: {
      enabled?: boolean
      logParams?: boolean
      logResults?: boolean
    }
    defaultSettings?: {
      temperature?: number
      maxTokens?: number
      providerMetadata?: Record<string, any>
    }
  }
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

interface ImageAttachment {
  id: string;
  url: string;
  type: 'image';
  width?: number;
  height?: number;
}

interface ToolCall {
  id: string;
  name: string;
  args: any;
  result?: string;
  status: 'pending' | 'completed' | 'error';
}



export function AiSdkChat({
  apiEndpoint = '/api/chat/ai-sdk',
  initialMessages = [],
  initialThreadId,
  modelId = 'gemini-2.0-flash-exp',
  temperature = 0.7,
  maxTokens = 8192,
  tools = [],
  className,
  provider = 'google',
  systemPrompt,
  personaId,
  streamProtocol = 'data',
  toolChoice = 'auto',
  maxSteps = 5,
  middleware
}: AiSdkChatProps) {
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSpeechRecording, setIsSpeechRecording] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [threadName, setThreadName] = useState('New Chat');
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState(systemPrompt || '');
  const [selectedPersonaId, setSelectedPersonaId] = useState(personaId || '');

  // Critical state variables
  const [isConnected, setIsConnected] = useState(true);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [lastSuccessfulResponse, setLastSuccessfulResponse] = useState<Date | null>(null);
  const [modelAvailability, setModelAvailability] = useState<Record<string, boolean>>({});
  const [fallbackModelId, setFallbackModelId] = useState<string>('gemini-2.0-flash');
  const [isUsingFallbackModel, setIsUsingFallbackModel] = useState(false);
  const [errorRecoveryMode, setErrorRecoveryMode] = useState<'none' | 'retry' | 'fallback'>('none');
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryDelay, setRetryDelay] = useState(1000);
  const [streamInterrupted, setStreamInterrupted] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Fetch models from Supabase with fallback to registry
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, { id: string, name: string }[]>>({});
  const [providers, setProviders] = useState<{ id: string, name: string }[]>([]);
  const [allModels, setAllModels] = useState<{ id: string, name: string }[]>([]);
  const [modelSettings, setModelSettings] = useState<Record<string, any>>({});
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoadingModels(true);

        // Fetch models from API
        const response = await fetch('/api/models');
        const data = await response.json();

        if (!data.models || !Array.isArray(data.models)) {
          throw new Error('Invalid response format');
        }

        // Group models by provider
        const modelsByProviderMap: Record<string, { id: string, name: string }[]> = {};
        const modelSettingsMap: Record<string, any> = {};

        data.models.forEach((model: any) => {
          // Add to models by provider
          if (!modelsByProviderMap[model.provider]) {
            modelsByProviderMap[model.provider] = [];
          }

          modelsByProviderMap[model.provider].push({
            id: model.model_id,
            name: model.name
          });

          // Add to model settings
          modelSettingsMap[model.model_id] = {
            id: model.id,
            name: model.name,
            provider: model.provider,
            model_id: model.model_id,
            max_tokens: model.max_tokens || 4096,
            context_window: model.context_window || 8192,
            supports_vision: model.supports_vision || false,
            supports_functions: model.supports_functions || false,
            supports_streaming: model.supports_streaming || true,
            default_temperature: model.default_temperature || 0.7,
            default_top_p: model.default_top_p || 1.0,
            default_frequency_penalty: model.default_frequency_penalty || 0,
            default_presence_penalty: model.default_presence_penalty || 0,
          };
        });

        // Get providers
        const providersArray = Object.keys(modelsByProviderMap).map(key => ({
          id: key,
          name: key.charAt(0).toUpperCase() + key.slice(1) // Capitalize first letter
        }));

        // Get all models
        const allModelsArray = Object.values(modelsByProviderMap).flat();

        setModelsByProvider(modelsByProviderMap);
        setProviders(providersArray);
        setAllModels(allModelsArray);
        setModelSettings(modelSettingsMap);
      } catch (error) {
        console.error('Error fetching models:', error);

        // Fallback to hardcoded models from model-registry.ts
        // This would be imported from the registry in a real implementation
        const fallbackModelsByProvider = {
          'google': [
            { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro Preview' },
            { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview' },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
            { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
            { id: 'gemini-2.0-flash-live-001', name: 'Gemini 2.0 Flash Live' }
          ],
          'openai': [
            { id: 'gpt-4.1', name: 'GPT-4.1' },
            { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
            { id: 'o4-mini', name: 'o4-mini' },
            { id: 'o3', name: 'o3' },
            { id: 'o3-mini', name: 'o3-mini' },
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
          ],
          'anthropic': [
            { id: 'claude-3-opus', name: 'Claude 3 Opus' },
            { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
            { id: 'claude-3-haiku', name: 'Claude 3 Haiku' }
          ]
        };

        const fallbackProviders = Object.keys(fallbackModelsByProvider).map(key => ({
          id: key,
          name: key.charAt(0).toUpperCase() + key.slice(1)
        }));

        const fallbackAllModels = Object.values(fallbackModelsByProvider).flat();

        // Fallback model settings
        const fallbackModelSettings: Record<string, any> = {
          // Gemini models
          'gemini-2.5-pro-preview-05-06': { max_tokens: 65536, context_window: 1048576, supports_vision: true, supports_functions: true },
          'gemini-2.5-flash-preview-04-17': { max_tokens: 65536, context_window: 1048576, supports_vision: true, supports_functions: true },
          'gemini-2.0-flash-exp': { max_tokens: 8192, context_window: 1048576, supports_vision: true, supports_functions: true },
          'gemini-2.0-flash': { max_tokens: 8192, context_window: 1048576, supports_vision: true, supports_functions: true },
          'gemini-2.0-flash-lite': { max_tokens: 8192, context_window: 1048576, supports_vision: true, supports_functions: true },
          'gemini-2.0-flash-live-001': { max_tokens: 8192, context_window: 1048576, supports_vision: true, supports_functions: true },
          'gemini-1.5-pro': { max_tokens: 8192, context_window: 2097152, supports_vision: true, supports_functions: true },
          'gemini-1.5-flash': { max_tokens: 8192, context_window: 1048576, supports_vision: true, supports_functions: true },

          // OpenAI models
          'gpt-4.1': { max_tokens: 32768, context_window: 1047576, supports_vision: true, supports_functions: true },
          'gpt-4.1-mini': { max_tokens: 32768, context_window: 1047576, supports_vision: true, supports_functions: true },
          'o4-mini': { max_tokens: 100000, context_window: 200000, supports_vision: true, supports_functions: true },
          'o3': { max_tokens: 100000, context_window: 200000, supports_vision: true, supports_functions: true },
          'o3-mini': { max_tokens: 100000, context_window: 200000, supports_vision: false, supports_functions: true },
          'gpt-4o': { max_tokens: 16384, context_window: 128000, supports_vision: true, supports_functions: true },
          'gpt-4o-mini': { max_tokens: 16384, context_window: 128000, supports_vision: true, supports_functions: true },

          // Anthropic models
          'claude-3-opus': { max_tokens: 4096, context_window: 200000, supports_vision: true, supports_functions: true },
          'claude-3-sonnet': { max_tokens: 4096, context_window: 200000, supports_vision: true, supports_functions: true },
          'claude-3-haiku': { max_tokens: 4096, context_window: 200000, supports_vision: true, supports_functions: true }
        };

        setModelsByProvider(fallbackModelsByProvider);
        setProviders(fallbackProviders);
        setAllModels(fallbackAllModels);
        setModelSettings(fallbackModelSettings);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  const [selectedModel, setSelectedModel] = useState(modelId);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedTemperature, setSelectedTemperature] = useState(temperature);
  const [selectedMaxTokens, setSelectedMaxTokens] = useState(maxTokens);
  const [enabledTools, setEnabledTools] = useState<string[]>(tools);
  const [isCopied, setIsCopied] = useState(false);

  // Define available tools/functions
  const availableFunctions = {
    'web-search': {
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        required: ['query']
      },
      execute: async (args: { query: string }) => {
        console.log('Searching for:', args.query);
        try {
          // Call the web search API
          const response = await fetch('/api/tools/web-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: args.query })
          });

          if (!response.ok) {
            throw new Error(`Search failed with status: ${response.status}`);
          }

          const data = await response.json();
          return data.results ?
            `Results for "${args.query}":\n\n${data.results.map((r: any, i: number) =>
              `${i+1}. [${r.title}](${r.url})\n${r.snippet || ''}`
            ).join('\n\n')}` :
            `No results found for "${args.query}"`;
        } catch (error: any) {
          console.error('Error searching web:', error);
          return `Error searching for "${args.query}": ${error.message || 'Unknown error'}`;
        }
      }
    },
    'weather': {
      description: 'Get current weather information',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city or location'
          }
        },
        required: ['location']
      },
      execute: async (args: { location: string }) => {
        console.log('Getting weather for:', args.location);
        try {
          // Call the weather API
          const response = await fetch('/api/tools/weather', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: args.location })
          });

          if (!response.ok) {
            throw new Error(`Weather request failed with status: ${response.status}`);
          }

          const data = await response.json();

          if (data.error) {
            throw new Error(data.error);
          }

          return `Weather in ${args.location}: ${data.temperature}°${data.unit || 'F'}, ${data.conditions}
Humidity: ${data.humidity}%
Wind: ${data.windSpeed} ${data.windUnit || 'mph'} ${data.windDirection || ''}`;
        } catch (error: any) {
          console.error('Error getting weather:', error);
          // Fallback to mock data if API fails
          return `Weather in ${args.location}: 72°F, Partly Cloudy (Note: Using fallback data due to API error: ${error.message || 'Unknown error'})`;
        }
      }
    },
    'image-generation': {
      description: 'Generate an image based on a description',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Description of the image to generate'
          },
          style: {
            type: 'string',
            description: 'Style of the image (vivid, natural, cinematic, anime, digital-art)',
            enum: ['vivid', 'natural', 'cinematic', 'anime', 'digital-art'],
            default: 'vivid'
          }
        },
        required: ['prompt']
      },
      execute: async (args: { prompt: string, style?: string }) => {
        console.log('Generating image for:', args.prompt, 'with style:', args.style || 'vivid');
        try {
          // Call the image generation API
          const response = await fetch('/api/tools/image-generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: args.prompt,
              style: args.style || 'vivid',
              size: '1024x1024'
            })
          });

          if (!response.ok) {
            throw new Error(`Image generation failed with status: ${response.status}`);
          }

          const data = await response.json();

          if (data.error) {
            throw new Error(data.error);
          }

          // Add the generated image to the image attachments
          if (data.imageUrl) {
            const imageId = nanoid();
            const newImage: ImageAttachment = {
              id: imageId,
              url: data.imageUrl,
              type: 'image'
            };

            setImageAttachments(prev => [...prev, newImage]);

            // Return the component with the actual image URL
            return `<AIImageGenerator imageUrl="${data.imageUrl}" prompt="${args.prompt}" style="${args.style || 'vivid'}" />`;
          } else {
            throw new Error('No image URL returned from the API');
          }
        } catch (error: any) {
          console.error('Error generating image:', error);
          // Return a placeholder component that will show the error
          return `<AIImageGenerator error="${error.message || 'Unknown error'}" prompt="${args.prompt}" style="${args.style || 'vivid'}" />`;
        }
      }
    },
    'computer-use': {
      description: 'Execute a computer task or command',
      parameters: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            description: 'The task or command to execute'
          },
          showSteps: {
            type: 'boolean',
            description: 'Whether to show the execution steps',
            default: false
          }
        },
        required: ['task']
      },
      execute: async (args: { task: string, showSteps?: boolean }) => {
        console.log('Executing computer task:', args.task, 'with showSteps:', args.showSteps);
        try {
          // Call the computer-use API to execute the task
          const response = await fetch('/api/tools/computer-use', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task: args.task,
              showSteps: args.showSteps || false
            })
          });

          if (!response.ok) {
            throw new Error(`Task execution failed with status: ${response.status}`);
          }

          const data = await response.json();

          if (data.error) {
            throw new Error(data.error);
          }

          // Return the component with the execution results
          return `<ComputerUse
            task="${args.task}"
            showSteps="${args.showSteps ? 'true' : 'false'}"
            result="${data.result ? data.result.replace(/"/g, '&quot;') : ''}"
            exitCode="${data.exitCode !== undefined ? data.exitCode : ''}"
            executionTime="${data.executionTime || ''}"
          />`;
        } catch (error: any) {
          console.error('Error executing computer task:', error);
          // Return a component that will show the error
          return `<ComputerUse
            task="${args.task}"
            showSteps="${args.showSteps ? 'true' : 'false'}"
            error="${error.message || 'Unknown error'}"
          />`;
        }
      }
    },
    'data-visualization': {
      description: 'Create a data visualization',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            description: 'The data to visualize',
            items: {
              type: 'object'
            }
          },
          type: {
            type: 'string',
            description: 'The type of visualization',
            enum: ['bar', 'line', 'pie', 'scatter'],
            default: 'bar'
          }
        },
        required: ['data']
      },
      execute: async (args: { data: any[], type?: string }) => {
        console.log('Creating visualization for data with type:', args.type || 'bar');
        try {
          // Validate the data
          if (!Array.isArray(args.data) || args.data.length === 0) {
            throw new Error('Invalid data: must be a non-empty array');
          }

          // Validate the visualization type
          const validTypes = ['bar', 'line', 'pie', 'scatter'];
          const type = args.type || 'bar';
          if (!validTypes.includes(type)) {
            throw new Error(`Invalid visualization type: ${type}. Must be one of: ${validTypes.join(', ')}`);
          }

          // Process the data for visualization
          // In a real implementation, you might want to transform the data based on the type

          // Return the component with the data and type
          return `<DataVisualization data='${JSON.stringify(args.data)}' type="${type}" />`;
        } catch (error: any) {
          console.error('Error creating visualization:', error);
          return `Error creating visualization: ${error.message || 'Unknown error'}`;
        }
      }
    },
    'browser-display': {
      description: 'Display a webpage in an iframe',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL of the webpage to display'
          },
          height: {
            type: 'string',
            description: 'The height of the iframe',
            default: '400px'
          }
        },
        required: ['url']
      },
      execute: async (args: { url: string, height?: string }) => {
        console.log('Displaying webpage:', args.url, 'with height:', args.height || '400px');
        try {
          // Validate URL
          const url = new URL(args.url);

          // Check if URL is allowed (you might want to implement a whitelist)
          const allowedDomains = ['github.com', 'vercel.com', 'nextjs.org', 'react.dev', 'tailwindcss.com'];
          const isAllowed = allowedDomains.some(domain => url.hostname.includes(domain));

          if (!isAllowed) {
            console.warn(`URL domain not in allowed list: ${url.hostname}`);
            // We'll still display it but with a warning
          }

          // Sanitize height
          const height = args.height || '400px';
          const sanitizedHeight = height.match(/^\d+(px|vh|%)$/) ? height : '400px';

          // Return the component with the URL and height
          return `<BrowserDisplay url="${args.url}" height="${sanitizedHeight}" />`;
        } catch (error: any) {
          console.error('Error displaying webpage:', error);
          return `Error displaying webpage: ${error.message || 'Invalid URL'}`;
        }
      }
    },
    'screen-share': {
      description: 'Display a screen recording or screenshot',
      parameters: {
        type: 'object',
        properties: {
          src: {
            type: 'string',
            description: 'The URL of the screen recording or screenshot'
          },
          title: {
            type: 'string',
            description: 'The title of the screen recording or screenshot',
            default: 'Screen Recording'
          },
          isVideo: {
            type: 'boolean',
            description: 'Whether the source is a video or an image',
            default: true
          }
        },
        required: ['src']
      },
      execute: async (args: { src: string, title?: string, isVideo?: boolean }) => {
        console.log('Displaying screen recording:', args.src, 'with title:', args.title || 'Screen Recording');
        // In a real implementation, this would display the screen recording
        return `<ScreenShare src="${args.src}" title="${args.title || 'Screen Recording'}" isVideo="${args.isVideo !== false}" />`;
      }
    },
    'interactive-map': {
      description: 'Display an interactive map',
      parameters: {
        type: 'object',
        properties: {
          center: {
            type: 'array',
            description: 'The center coordinates of the map [latitude, longitude]',
            items: {
              type: 'number'
            },
            minItems: 2,
            maxItems: 2
          },
          zoom: {
            type: 'number',
            description: 'The zoom level of the map',
            default: 13
          },
          locations: {
            type: 'array',
            description: 'The locations to display on the map',
            items: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
                title: { type: 'string' },
                description: { type: 'string' }
              },
              required: ['lat', 'lng']
            },
            default: []
          }
        },
        required: ['center']
      },
      execute: async (args: { center: [number, number], zoom?: number, locations?: any[] }) => {
        console.log('Displaying map at:', args.center, 'with zoom:', args.zoom || 13);
        // In a real implementation, this would display the map
        return `<InteractiveMap center="[${args.center[0]},${args.center[1]}]" zoom="${args.zoom || 13}" locations='${JSON.stringify(args.locations || [])}' />`;
      }
    },
    'interactive-form': {
      description: 'Display an interactive form',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the form',
            default: 'Feedback Form'
          },
          fields: {
            type: 'array',
            description: 'The fields to display in the form',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: {
                  type: 'string',
                  enum: ['text', 'textarea', 'number', 'email', 'checkbox', 'radio', 'select', 'date']
                },
                label: { type: 'string' },
                placeholder: { type: 'string' },
                required: { type: 'boolean' },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      value: { type: 'string' },
                      label: { type: 'string' }
                    },
                    required: ['value', 'label']
                  }
                }
              },
              required: ['id', 'type', 'label']
            }
          },
          submitLabel: {
            type: 'string',
            description: 'The label for the submit button',
            default: 'Submit'
          }
        },
        required: ['title', 'fields']
      },
      execute: async (args: { title: string, fields: any[], submitLabel?: string }) => {
        console.log('Displaying form with title:', args.title, 'and fields:', args.fields);
        // In a real implementation, this would display the form
        return `<InteractiveForm title="${args.title}" fields='${JSON.stringify(args.fields)}' submitLabel="${args.submitLabel || 'Submit'}" />`;
      }
    }
  };

  // Track function calls
  const [functionCalls, setFunctionCalls] = useState<ToolCall[]>([]);

  // Fetch threads
  const [threads, setThreads] = useState<{ id: string; name: string; updatedAt: string }[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // Fetch threads on component mount
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setIsLoadingThreads(true);
        const response = await fetch('/api/chat/ai-sdk/threads');
        const data = await response.json();
        setThreads(data.threads);
      } catch (error) {
        console.error('Error fetching threads:', error);
      } finally {
        setIsLoadingThreads(false);
      }
    };

    fetchThreads();
  }, []);

  // Create a new thread
  const createThread = async (name: string = 'New Chat') => {
    try {
      const response = await fetch('/api/chat/ai-sdk/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      const thread = await response.json();
      setThreads(prev => [thread, ...prev]);
      return thread.id;
    } catch (error) {
      console.error('Error creating thread:', error);
      return null;
    }
  };

  // Track current thread ID
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(initialThreadId);

  // Use the AI SDK useChat hook
  // Function to handle model fallback
  const handleModelFallback = (error: Error) => {
    setLastError(error);
    setIsUsingFallbackModel(true);
    setErrorRecoveryMode('fallback');

    // Set fallback model based on provider
    let fallbackModel = 'gemini-2.0-flash';
    if (selectedProvider === 'openai') {
      fallbackModel = 'gpt-4o-mini';
    } else if (selectedProvider === 'anthropic') {
      fallbackModel = 'claude-3-haiku';
    }

    setFallbackModelId(fallbackModel);

    toast({
      title: 'Using Fallback Model',
      description: `Switched to ${fallbackModel} due to an error with ${selectedModel}`,
      variant: 'default'
    });

    return fallbackModel;
  };

  // Function to handle connection issues
  const handleConnectionIssue = () => {
    setIsConnected(false);
    setConnectionRetries(prev => prev + 1);
    setStreamInterrupted(true);

    toast({
      title: 'Connection Issue',
      description: 'Attempting to reconnect...',
      variant: 'default'
    });

    // Attempt to reconnect after delay
    setTimeout(() => {
      setIsConnected(true);
      reload();
    }, retryDelay);
  };

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
    reload,
    stop,
    setInput,
    setMessages,
    addToolResult
  } = useChat({
    api: apiEndpoint,
    initialMessages,
    id: currentThreadId,
    body: {
      model: isUsingFallbackModel ? fallbackModelId : selectedModel,
      temperature: selectedTemperature,
      maxTokens: selectedMaxTokens,
      provider: selectedProvider,
      systemPrompt: selectedSystemPrompt,
      personaId: selectedPersonaId,
      streamProtocol: streamProtocol,
      toolChoice: toolChoice,
      maxSteps: maxSteps,
      images: imageAttachments,
      tools: enabledTools.length > 0 ? enabledTools.map(toolName => {
        const tool = availableFunctions[toolName as keyof typeof availableFunctions];
        return {
          type: 'function',
          function: {
            name: toolName,
            description: tool?.description || '',
            parameters: tool?.parameters || {}
          }
        };
      }) : undefined,
      middleware: middleware
    },
    onResponse: (response) => {
      // Reset error recovery state on successful response
      if (response.ok) {
        setIsConnected(true);
        setConnectionRetries(0);
        setLastSuccessfulResponse(new Date());
        setErrorRecoveryMode('none');
        setStreamInterrupted(false);

        // If we were using a fallback model but the primary is now working, switch back
        if (isUsingFallbackModel) {
          // Update model availability
          setModelAvailability(prev => ({
            ...prev,
            [selectedModel]: true
          }));

          // Only switch back on the next request to avoid disrupting current response
          if (messages.length === 0) {
            setIsUsingFallbackModel(false);
            toast({
              title: 'Model Restored',
              description: `Switched back to ${selectedModel}`,
              variant: 'default'
            });
          }
        }
      }

      // Extract thread ID from response headers
      const threadId = response.headers.get('x-thread-id');
      if (threadId && !currentThreadId) {
        // Update current thread ID
        setCurrentThreadId(threadId);

        // Update URL with thread ID
        const url = new URL(window.location.href);
        url.searchParams.set('thread', threadId);
        window.history.pushState({}, '', url.toString());
      }
    },
    onFinish: (message) => {
      // Handle any post-completion actions
      console.log('Chat completed:', message);

      // Refresh threads list to update last activity
      fetch('/api/chat/ai-sdk/threads')
        .then(res => res.json())
        .then(data => setThreads(data.threads))
        .catch(err => console.error('Error refreshing threads:', err));

      // Process tool calls if any
      if ((message as any).toolCalls && (message as any).toolCalls.length > 0) {
        (message as any).toolCalls.forEach((toolCall: any) => {
          // Track this tool call
          const callId = toolCall.id || nanoid();
          const newToolCall: ToolCall = {
            id: callId,
            name: toolCall.name,
            args: toolCall.args || {},
            status: 'pending'
          };

          setFunctionCalls(prev => [...prev, newToolCall]);

          // Execute the tool if available
          const fn = availableFunctions[toolCall.name as keyof typeof availableFunctions];
          if (fn) {
            fn.execute(toolCall.args)
              .then(result => {
                // Update the function call with the result
                setFunctionCalls(prev =>
                  prev.map(call =>
                    call.id === callId
                      ? { ...call, result, status: 'completed' as const }
                      : call
                  )
                );

                // Add the tool result to the chat
                addToolResult({
                  toolCallId: callId,
                  result
                });
              })
              .catch(error => {
                // Update the function call with the error
                setFunctionCalls(prev =>
                  prev.map(call =>
                    call.id === callId
                      ? { ...call, result: String(error), status: 'error' as const }
                      : call
                  )
                );

                console.error('Tool execution error:', error);
                setLastError(error);
              });
          }
        });
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setLastError(error);

      // Check if it's a model-related error
      const errorMessage = error.message?.toLowerCase() || '';
      const isModelError = errorMessage.includes('model') ||
                          errorMessage.includes('capacity') ||
                          errorMessage.includes('unavailable') ||
                          errorMessage.includes('overloaded');

      // Check if it's a connection error
      const isConnectionError = errorMessage.includes('network') ||
                               errorMessage.includes('connection') ||
                               errorMessage.includes('timeout') ||
                               error.name === 'AbortError';

      if (isModelError) {
        // Mark model as unavailable
        setModelAvailability(prev => ({
          ...prev,
          [selectedModel]: false
        }));

        // Use fallback model
        if (!isUsingFallbackModel && connectionRetries >= maxRetries) {
          const fallbackModel = handleModelFallback(error);

          // Retry with fallback model
          setTimeout(() => {
            reload();
          }, 1000);
        } else if (connectionRetries < maxRetries) {
          // Try again with same model
          setErrorRecoveryMode('retry');
          setConnectionRetries(prev => prev + 1);

          setTimeout(() => {
            reload();
          }, retryDelay * (connectionRetries + 1)); // Exponential backoff
        }
      } else if (isConnectionError) {
        handleConnectionIssue();
      } else {
        // Generic error handling
        toast({
          title: 'Error',
          description: error.message || 'An error occurred during the chat',
          variant: 'destructive'
        });
      }
    }
  });

  // Load thread messages
  const loadThread = async (threadId: string) => {
    try {
      const response = await fetch(`/api/chat/ai-sdk/threads/${threadId}?messages=true`);
      const data = await response.json();

      if (data.messages) {
        // Format messages for AI SDK
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt
        }));

        // Set messages in the chat
        setMessages(formattedMessages);

        // Update thread name
        setThreadName(data.name);

        // Update URL with thread ID
        const url = new URL(window.location.href);
        url.searchParams.set('thread', threadId);
        window.history.pushState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Error loading thread:', error);
    }
  };

  // Handle function calls
  const handleFunctionCall = async (functionCall: any) => {
    // Track this function call
    const callId = nanoid();
    const newFunctionCall = {
      id: callId,
      name: functionCall.name,
      args: functionCall.arguments,
      status: 'pending' as const
    };

    setFunctionCalls(prev => [...prev, newFunctionCall]);

    try {
      // Execute the function
      const fn = availableFunctions[functionCall.name as keyof typeof availableFunctions];
      if (!fn) {
        throw new Error(`Function ${functionCall.name} not found`);
      }

      const result = await fn.execute(JSON.parse(functionCall.arguments));

      // Update the function call with the result
      setFunctionCalls(prev =>
        prev.map(call =>
          call.id === callId
            ? { ...call, result, status: 'completed' as const }
            : call
        )
      );

      // In a real implementation, you would send the result back to continue the conversation
      console.log('Function result:', result);

      return result;
    } catch (error) {
      // Update the function call with the error
      setFunctionCalls(prev =>
        prev.map(call =>
          call.id === callId
            ? { ...call, result: String(error), status: 'error' as const }
            : call
        )
      );

      console.error('Function error:', error);
    }
  };

  // Derived state
  const isLoading = status === 'streaming' || status === 'submitted';

  // Show fallback model indicator when using fallback
  useEffect(() => {
    if (isUsingFallbackModel) {
      toast({
        title: 'Using Fallback Model',
        description: `Using ${fallbackModelId} instead of ${selectedModel}`,
        variant: 'default',
        duration: 5000
      });
    }
  }, [isUsingFallbackModel, fallbackModelId, selectedModel]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);

      // Process each file
      const newAttachments: FileAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // In a real app, you would upload the file to a server here
        // For this example, we'll create a fake URL
        const fileId = nanoid();
        const fileType = file.type.startsWith('image/') ? 'image' : 'file';

        newAttachments.push({
          id: fileId,
          name: file.name,
          type: fileType,
          url: URL.createObjectURL(file),
          size: file.size
        });
      }

      // Complete the upload
      clearInterval(interval);
      setUploadProgress(100);

      // Add attachments
      setAttachments(prev => [...prev, ...newAttachments]);

      // Update the input to mention the attachments
      if (newAttachments.length > 0) {
        const fileNames = newAttachments.map(a => a.name).join(', ');
        const fileType = newAttachments[0].type === 'image' ? 'image' : 'file';
        const message = `I'm sending you ${newAttachments.length > 1 ? 'these' : 'this'} ${fileType}${newAttachments.length > 1 ? 's' : ''}: ${fileNames}. `;
        setInput(prev => message + prev);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Handle speech input
  const handleSpeechInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isSpeechRecording) {
      // If already recording, stop recording
      setIsSpeechRecording(false);
      return;
    }

    setIsSpeechRecording(true);

    // This is a simplified example - in a real app, you would use the Web Speech API
    setTimeout(() => {
      setInput(prev => prev + 'This is a speech input example. ');
      setIsSpeechRecording(false);
    }, 2000);
  };

  // Copy conversation to clipboard
  const copyConversation = () => {
    const text = messages.map(m => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Clear conversation
  const clearConversation = async () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      if (initialThreadId) {
        try {
          // Delete the thread via API
          await fetch(`/api/chat/ai-sdk/threads/${initialThreadId}`, {
            method: 'DELETE'
          });

          // Refresh the threads list
          const response = await fetch('/api/chat/ai-sdk/threads');
          const data = await response.json();
          setThreads(data.threads);

          // Clear messages and create a new thread
          setMessages([]);
          const newThreadId = await createThread('New Chat');
          if (newThreadId) {
            setThreadName('New Chat');
            const url = new URL(window.location.href);
            url.searchParams.set('thread', newThreadId);
            window.history.pushState({}, '', url.toString());
          }
        } catch (error) {
          console.error('Error deleting thread:', error);
        }
      } else {
        // Just clear the messages if no thread ID
        setMessages([]);
      }
    }
  };

  // Toggle fullscreen
  const toggleFullScreen = () => {
    setIsFullScreen(prev => !prev);
    // In a real app, you would implement actual fullscreen functionality
  };

  // Handle form submission
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === '') return;

    // Clear attachments after sending
    setAttachments([]);

    // Submit the form
    handleSubmit(e);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  // Render content with special components
  const renderContent = (content: string) => {
    // Check for special components and code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

    // Special component regex patterns
    const imageDisplayRegex = /<ImageDisplay\s+src="([^"]+)"(?:\s+alt="([^"]+)")?(?:\s+width="([^"]+)")?(?:\s+height="([^"]+)")?\s*\/>/g;
    const aiImageGeneratorRegex = /<AIImageGenerator\s+prompt="([^"]+)"(?:\s+style="([^"]+)")?\s*\/>/g;
    const computerUseRegex = /<ComputerUse\s+task="([^"]+)"(?:\s+showSteps="(true|false)")?\s*\/>/g;
    const dataVisualizationRegex = /<DataVisualization\s+data="([^"]+)"(?:\s+type="([^"]+)")?\s*\/>/g;
    const visualizationWithTracingRegex = /<VisualizationWithTracing\s+data="([^"]+)"(?:\s+type="([^"]+)")?\s*\/>/g;
    const dataTableRegex = /<DataTable\s+data="([^"]+)"(?:\s+columns="([^"]+)")?\s*\/>/g;
    const browserDisplayRegex = /<BrowserDisplay\s+url="([^"]+)"(?:\s+height="([^"]+)")?\s*\/>/g;
    const screenShareRegex = /<ScreenShare\s+src="([^"]+)"(?:\s+title="([^"]+)")?(?:\s+isVideo="(true|false)")?\s*\/>/g;
    const interactiveMapRegex = /<InteractiveMap\s+center="\[([^,]+),([^,]+)\]"(?:\s+zoom="([^"]+)")?(?:\s+locations="([^"]+)")?\s*\/>/g;
    const interactiveFormRegex = /<InteractiveForm\s+title="([^"]+)"(?:\s+fields="([^"]+)")?(?:\s+submitLabel="([^"]+)")?\s*\/>/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    // Helper function to process text before a match
    const processTextBeforeMatch = (matchIndex: number) => {
      if (matchIndex > lastIndex) {
        // Process the text segment for code blocks
        const textSegment = content.slice(lastIndex, matchIndex);
        const codeMatches = [...textSegment.matchAll(codeBlockRegex)];

        if (codeMatches.length > 0) {
          let textLastIndex = 0;

          for (const codeMatch of codeMatches) {
            const codeMatchIndex = codeMatch.index || 0;

            // Add text before code block
            if (codeMatchIndex > textLastIndex) {
              parts.push(
                <p key={`text-${lastIndex + textLastIndex}`} className="whitespace-pre-wrap">
                  {textSegment.slice(textLastIndex, codeMatchIndex)}
                </p>
              );
            }

            const language = codeMatch[1] || 'plaintext';
            const code = codeMatch[2];

            // Handle special code blocks
            if (language === 'mermaid') {
              parts.push(<MermaidDiagram key={`mermaid-${lastIndex + codeMatchIndex}`} code={code} />);
            } else {
              parts.push(
                <CodeBlock key={`code-${lastIndex + codeMatchIndex}`} language={language} code={code} />
              );
            }

            textLastIndex = codeMatchIndex + codeMatch[0].length;
          }

          // Add remaining text
          if (textLastIndex < textSegment.length) {
            parts.push(
              <p key={`text-${lastIndex + textLastIndex}`} className="whitespace-pre-wrap">
                {textSegment.slice(textLastIndex)}
              </p>
            );
          }
        } else {
          // No code blocks, just add the text
          parts.push(
            <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
              {textSegment}
            </p>
          );
        }
      }
    };

    // Process ImageDisplay components
    while ((match = imageDisplayRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const src = match[1];
      const alt = match[2] || '';
      const width = match[3] || 'auto';
      const height = match[4] || 'auto';

      parts.push(
        <ImageDisplay
          key={`image-${match.index}`}
          src={src}
          alt={alt}
          className={`max-w-full ${width !== 'auto' ? `w-[${width}]` : ''} ${height !== 'auto' ? `h-[${height}]` : ''}`}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Process AIImageGenerator components
    while ((match = aiImageGeneratorRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const prompt = match[1];
      // Style is not used in the current component implementation
      // const style = match[2] || 'vivid';

      parts.push(
        <AIImageGenerator
          key={`ai-image-${match.index}`}
          initialPrompt={prompt}
          title={`Generated Image: ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}`}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Process ComputerUse components
    while ((match = computerUseRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const task = match[1];
      const showSteps = match[2] === 'true';

      parts.push(
        <ComputerUse
          key={`computer-${match.index}`}
          title={`Computer Task: ${task.substring(0, 30)}${task.length > 30 ? '...' : ''}`}
          content={task}
          isTerminal={true}
          isRunnable={showSteps}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Process DataVisualization components
    while ((match = dataVisualizationRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const data = match[1];
      const type = match[2] || 'bar';

      try {
        const parsedData = JSON.parse(data);
        parts.push(
          <DataVisualization
            key={`viz-${match.index}`}
            data={parsedData}
            type={type as any}
          />
        );
      } catch (e) {
        parts.push(
          <p key={`viz-error-${match.index}`} className="text-red-500">
            Error parsing data visualization: {String(e)}
          </p>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Process VisualizationWithTracing components
    while ((match = visualizationWithTracingRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const data = match[1];
      const type = match[2] || 'bar';

      try {
        const parsedData = JSON.parse(data);
        parts.push(
          <VisualizationWithTracing
            key={`viz-trace-${match.index}`}
            data={parsedData}
            type={type as any}
          />
        );
      } catch (e) {
        parts.push(
          <p key={`viz-trace-error-${match.index}`} className="text-red-500">
            Error parsing visualization with tracing: {String(e)}
          </p>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Process DataTable components
    while ((match = dataTableRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const data = match[1];
      const columns = match[2] || '';

      try {
        const parsedData = JSON.parse(data);
        const parsedColumns = columns ? JSON.parse(columns) : null;
        parts.push(
          <DataTable
            key={`table-${match.index}`}
            data={parsedData}
            columns={parsedColumns}
          />
        );
      } catch (e) {
        parts.push(
          <p key={`table-error-${match.index}`} className="text-red-500">
            Error parsing data table: {String(e)}
          </p>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Process BrowserDisplay components
    while ((match = browserDisplayRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const url = match[1];
      const height = match[2] || '400px';

      parts.push(
        <BrowserDisplay
          key={`browser-${match.index}`}
          url={url}
          title={`Browser: ${url}`}
          className={`h-[${height}]`}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Process ScreenShare components
    while ((match = screenShareRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const src = match[1];
      const title = match[2] || 'Screen Recording';
      const isVideo = match[3] !== 'false'; // Default to true

      parts.push(
        <ScreenShare
          key={`screen-${match.index}`}
          src={src}
          title={title}
          isVideo={isVideo}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Process InteractiveMap components
    while ((match = interactiveMapRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      const zoom = match[3] ? parseInt(match[3]) : 13;
      const locationsStr = match[4] || '[]';

      try {
        const locations = JSON.parse(locationsStr);
        parts.push(
          <InteractiveMap
            key={`map-${match.index}`}
            center={[lat, lng]}
            zoom={zoom}
            locations={locations}
            title={`Map: ${lat}, ${lng}`}
          />
        );
      } catch (e) {
        parts.push(
          <p key={`map-error-${match.index}`} className="text-red-500">
            Error parsing map data: {String(e)}
          </p>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Process InteractiveForm components
    while ((match = interactiveFormRegex.exec(content)) !== null) {
      processTextBeforeMatch(match.index);

      const title = match[1];
      const fieldsStr = match[2] || '[]';
      const submitLabel = match[3] || 'Submit';

      try {
        const fields = JSON.parse(fieldsStr);
        parts.push(
          <InteractiveForm
            key={`form-${match.index}`}
            title={title}
            fields={fields}
            submitLabel={submitLabel}
            onSubmit={(data) => console.log('Form submitted:', data)}
          />
        );
      } catch (e) {
        parts.push(
          <p key={`form-error-${match.index}`} className="text-red-500">
            Error parsing form data: {String(e)}
          </p>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Process remaining content
    if (lastIndex < content.length) {
      const remainingContent = content.slice(lastIndex);
      const codeMatches = [...remainingContent.matchAll(codeBlockRegex)];

      if (codeMatches.length > 0) {
        let textLastIndex = 0;

        for (const codeMatch of codeMatches) {
          const codeMatchIndex = codeMatch.index || 0;

          // Add text before code block
          if (codeMatchIndex > textLastIndex) {
            parts.push(
              <p key={`text-${lastIndex + textLastIndex}`} className="whitespace-pre-wrap">
                {remainingContent.slice(textLastIndex, codeMatchIndex)}
              </p>
            );
          }

          const language = codeMatch[1] || 'plaintext';
          const code = codeMatch[2];

          // Handle special code blocks
          if (language === 'mermaid') {
            parts.push(<MermaidDiagram key={`mermaid-${lastIndex + codeMatchIndex}`} code={code} />);
          } else {
            parts.push(
              <CodeBlock key={`code-${lastIndex + codeMatchIndex}`} language={language} code={code} />
            );
          }

          textLastIndex = codeMatchIndex + codeMatch[0].length;
        }

        // Add remaining text
        if (textLastIndex < remainingContent.length) {
          parts.push(
            <p key={`text-${lastIndex + textLastIndex}`} className="whitespace-pre-wrap">
              {remainingContent.slice(textLastIndex)}
            </p>
          );
        }
      } else {
        // No code blocks, just add the text
        parts.push(
          <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {remainingContent}
          </p>
        );
      }
    }

    return parts.length > 0 ? parts : <p className="whitespace-pre-wrap">{content}</p>;
  };

  return (
    <div className={cn('flex h-full', className, isFullScreen && 'fixed inset-0 z-50 bg-background')}>
      {/* Thread Sidebar */}
      <div className="w-64 border-r h-full flex flex-col bg-muted/30">
        <div className="p-3 border-b flex justify-between items-center">
          <h3 className="font-medium text-sm">Chat History</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => createThread('New Chat').then(id => {
              if (id) {
                setMessages([]);
                setThreadName('New Chat');
                const url = new URL(window.location.href);
                url.searchParams.set('thread', id);
                window.history.pushState({}, '', url.toString());
              }
            })}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {isLoadingThreads ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length > 0 ? (
            threads.map(thread => (
              <Button
                key={thread.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left font-normal truncate h-auto py-2",
                  initialThreadId === thread.id && "bg-accent"
                )}
                onClick={() => loadThread(thread.id)}
              >
                <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{thread.name}</span>
              </Button>
            ))
          ) : (
            <div className="text-center p-4 text-sm text-muted-foreground">
              No chat history
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-600 text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="cursor-pointer" onClick={() => {
              const newName = prompt("Enter a new name for this chat:", threadName);
              if (newName && newName.trim() !== "") {
                setThreadName(newName.trim());

                // Update thread name in the database if we have a thread ID
                if (initialThreadId) {
                  fetch(`/api/chat/ai-sdk/threads/${initialThreadId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName.trim() })
                  }).catch(err => console.error('Error updating thread name:', err));
                }
              }
            }}>
              <h3 className="font-medium hover:underline">{threadName}</h3>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {isUsingFallbackModel ? fallbackModelId : selectedModel} • {selectedTemperature.toFixed(1)} temperature
                </p>

                {/* Connection status indicator */}
                {!isConnected && (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    Reconnecting...
                  </Badge>
                )}

                {/* Fallback model indicator */}
                {isUsingFallbackModel && (
                  <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                    Fallback
                  </Badge>
                )}

                {/* Stream interrupted indicator */}
                {streamInterrupted && (
                  <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                    Interrupted
                  </Badge>
                )}

                {/* Error recovery mode indicator */}
                {errorRecoveryMode !== 'none' && (
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                    {errorRecoveryMode === 'retry' ? 'Retrying' : 'Fallback'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={copyConversation}>
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy conversation</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={clearConversation}>
                    <Eraser className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear conversation</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={toggleFullScreen}>
                    {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3 group"
            >
              {message.role === 'user' ? (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="bg-blue-600 text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1">
                <Card className={cn('p-3 mb-1',
                  message.role === 'user'
                    ? 'bg-muted'
                    : 'bg-card border-blue-100 dark:border-blue-900'
                )}>
                  <CardContent className="p-0 space-y-2">
                    {renderContent(message.content)}
                  </CardContent>
                </Card>

                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Good response</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Bad response</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Copy</span>
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <Avatar className="h-8 w-8 mt-1">
              <AvatarFallback className="bg-blue-600 text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <Card className="flex-1 p-3 bg-card border-blue-100 dark:border-blue-900">
              <CardContent className="p-0">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <Avatar className="h-8 w-8 mt-1">
              <AvatarFallback className="bg-red-600 text-white">
                <XCircle className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <Card className="flex-1 p-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-0 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-red-600 dark:text-red-400">Error</p>
                  {errorRecoveryMode !== 'none' && (
                    <Badge variant={errorRecoveryMode === 'retry' ? 'outline' : 'secondary'} className="text-xs">
                      {errorRecoveryMode === 'retry' ? `Retry ${connectionRetries}/${maxRetries}` : 'Using Fallback Model'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{error.message || 'Something went wrong. Please try again.'}</p>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => reload()}>
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Retry
                  </Button>

                  {!isUsingFallbackModel && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleModelFallback(error);
                        setTimeout(() => reload(), 1000);
                      }}
                    >
                      <Zap className="h-3 w-3 mr-2" />
                      Use Fallback Model
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Function calls */}
        {functionCalls.length > 0 && (
          <div className="space-y-2 mt-2">
            <h4 className="text-sm font-medium">Function Calls</h4>
            {functionCalls.map((call) => (
              <div key={call.id} className="border rounded-md p-2 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={cn(
                      "h-4 w-4",
                      call.status === 'pending' ? "text-yellow-500" :
                      call.status === 'completed' ? "text-green-500" :
                      "text-red-500"
                    )} />
                    <span className="font-medium">{call.name}</span>
                  </div>
                  <Badge variant={
                    call.status === 'pending' ? "outline" :
                    call.status === 'completed' ? "success" :
                    "destructive"
                  }>
                    {call.status}
                  </Badge>
                </div>
                <div className="mt-1 text-xs">
                  <p className="text-muted-foreground">Arguments: {JSON.stringify(call.args)}</p>
                  {call.result && (
                    <p className="mt-1">
                      Result: <span className={call.status === 'error' ? "text-red-500" : ""}>{call.result}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* File attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative group">
                {attachment.type === 'image' ? (
                  <div className="relative w-24 h-24 rounded-md overflow-hidden border">
                    <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setAttachments(prev => prev.filter(a => a.id !== attachment.id))}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center p-2 border rounded-md bg-muted">
                    <FileText className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="text-xs truncate max-w-[100px]">{attachment.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setAttachments(prev => prev.filter(a => a.id !== attachment.id))}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="mt-2">
            <Progress value={uploadProgress} className="h-1" />
            <p className="text-xs text-muted-foreground mt-1">Uploading... {uploadProgress}%</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <div className="border-t p-4">
        <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[60px] max-h-[200px] resize-none"
              disabled={isLoading === true}
            />
            <div className="flex flex-col gap-2">
              {isLoading ? (
                <Button type="button" variant="destructive" size="icon" onClick={stop}>
                  <XCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" size="icon" disabled={input.trim() === ''}>
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleFileSelect}>
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Attach files</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={isSpeechRecording ? "secondary" : "ghost"}
                      size="icon"
                      className={`h-8 w-8 ${isSpeechRecording ? "animate-pulse" : ""}`}
                      onClick={handleSpeechInput}
                    >
                      <Mic className={`h-4 w-4 ${isSpeechRecording ? "text-red-500" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isSpeechRecording ? "Stop recording" : "Voice input"}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                      <Code className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Format as code</p>
                  </TooltipContent>
                </Tooltip>

                {/* Test function call button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        // Simulate a function call for testing
                        handleFunctionCall({
                          name: 'weather',
                          arguments: JSON.stringify({ location: 'New York' })
                        });
                      }}
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Test function call</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              {enabledTools.length > 0 && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>Using {enabledTools.length} tools</span>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
      </div>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                className="w-full p-2 border rounded-md"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                <option value="all">All Providers</option>
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>{provider.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <select
                id="model"
                className="w-full p-2 border rounded-md"
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);

                  // Update max tokens based on model settings
                  if (modelSettings[e.target.value]?.max_tokens) {
                    // Set max tokens to either the current value or the model's max, whichever is smaller
                    const modelMaxTokens = modelSettings[e.target.value].max_tokens;
                    if (selectedMaxTokens > modelMaxTokens) {
                      setSelectedMaxTokens(modelMaxTokens);
                    }
                  }
                }}
              >
                {selectedProvider === 'all' ? (
                  // Show all models grouped by provider
                  Object.entries(modelsByProvider).map(([provider, models]) => (
                    <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                      {models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                          {modelSettings[model.id]?.supports_vision && " (Vision)"}
                          {modelSettings[model.id]?.supports_functions && " (Functions)"}
                        </option>
                      ))}
                    </optgroup>
                  ))
                ) : (
                  // Show only models for the selected provider
                  modelsByProvider[selectedProvider as keyof typeof modelsByProvider]?.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                      {modelSettings[model.id]?.supports_vision && " (Vision)"}
                      {modelSettings[model.id]?.supports_functions && " (Functions)"}
                    </option>
                  ))
                )}
              </select>

              {/* Model capabilities */}
              {modelSettings[selectedModel] && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap gap-1 mt-1">
                    {modelSettings[selectedModel].supports_vision && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">Vision</span>
                    )}
                    {modelSettings[selectedModel].supports_functions && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">Functions</span>
                    )}
                    {modelSettings[selectedModel].supports_streaming && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">Streaming</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="temperature">Temperature: {selectedTemperature.toFixed(1)}</Label>
              </div>
              <input
                id="temperature"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={selectedTemperature}
                onChange={(e) => setSelectedTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower values produce more focused and deterministic responses.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="max-tokens">Max Tokens: {selectedMaxTokens}</Label>
              </div>
              <input
                id="max-tokens"
                type="range"
                min={256}
                max={modelSettings[selectedModel]?.max_tokens || 4096}
                step={256}
                value={selectedMaxTokens}
                onChange={(e) => setSelectedMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tokens to generate in the response.
                {modelSettings[selectedModel]?.context_window && (
                  <span className="block mt-1">
                    Model context window: {modelSettings[selectedModel].context_window.toLocaleString()} tokens
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tools</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="web-search" className="cursor-pointer">Web Search</Label>
                  <Switch
                    id="web-search"
                    checked={enabledTools.includes('web-search')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'web-search']
                          : prev.filter(t => t !== 'web-search')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="weather" className="cursor-pointer">Weather</Label>
                  <Switch
                    id="weather"
                    checked={enabledTools.includes('weather')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'weather']
                          : prev.filter(t => t !== 'weather')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="image-generation" className="cursor-pointer">Image Generation</Label>
                  <Switch
                    id="image-generation"
                    checked={enabledTools.includes('image-generation')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'image-generation']
                          : prev.filter(t => t !== 'image-generation')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="computer-use" className="cursor-pointer">Computer Use</Label>
                  <Switch
                    id="computer-use"
                    checked={enabledTools.includes('computer-use')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'computer-use']
                          : prev.filter(t => t !== 'computer-use')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="data-visualization" className="cursor-pointer">Data Visualization</Label>
                  <Switch
                    id="data-visualization"
                    checked={enabledTools.includes('data-visualization')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'data-visualization']
                          : prev.filter(t => t !== 'data-visualization')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="browser-display" className="cursor-pointer">Browser Display</Label>
                  <Switch
                    id="browser-display"
                    checked={enabledTools.includes('browser-display')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'browser-display']
                          : prev.filter(t => t !== 'browser-display')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="screen-share" className="cursor-pointer">Screen Share</Label>
                  <Switch
                    id="screen-share"
                    checked={enabledTools.includes('screen-share')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'screen-share']
                          : prev.filter(t => t !== 'screen-share')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="interactive-map" className="cursor-pointer">Interactive Map</Label>
                  <Switch
                    id="interactive-map"
                    checked={enabledTools.includes('interactive-map')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'interactive-map']
                          : prev.filter(t => t !== 'interactive-map')
                      );
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="interactive-form" className="cursor-pointer">Interactive Form</Label>
                  <Switch
                    id="interactive-form"
                    checked={enabledTools.includes('interactive-form')}
                    onCheckedChange={(checked) => {
                      setEnabledTools(prev =>
                        checked
                          ? [...prev, 'interactive-form']
                          : prev.filter(t => t !== 'interactive-form')
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

