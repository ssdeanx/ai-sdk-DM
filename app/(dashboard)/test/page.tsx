'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define the model type for better type safety
interface Model {
  id: string;
  name: string;
  provider?: string;
  modelId?: string;
  baseUrl?: string;
  status?: string;
}

export default function TestPage() {
  const { toast } = useToast();
  const [modelId, setModelId] = useState('');
  const [models, setModels] = useState<Model[]>([]); // Initialize as empty array with proper type
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<
    Array<{ id: string; role: string; content: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [memoryThreadId, setMemoryThreadId] = useState('');
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch models on component mount
  useEffect(() => {
    async function fetchModels() {
      setIsFetchingModels(true);
      setConnectionError(false);

      try {
        const response = await fetch('/api/models');

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();

        // Check if the response has the expected structure
        if (data && data.models && Array.isArray(data.models)) {
          setModels(data.models);

          if (data.models.length > 0) {
            setModelId(data.models[0].id);
          }
        } else if (Array.isArray(data)) {
          // Handle case where API returns array directly
          setModels(data);

          if (data.length > 0) {
            setModelId(data[0].id);
          }
        } else {
          // If data is not in expected format, show error and use empty array
          console.error('Unexpected data format:', data);
          setModels([]);
          toast({
            title: 'Error',
            description: 'Received unexpected data format from API',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        setModels([]);
        setConnectionError(true);

        const isNetworkError =
          error instanceof Error &&
          (error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('HTTP error 5'));

        toast({
          title: 'Connection Error',
          description: isNetworkError
            ? 'Could not connect to the backend. Please check your connection and ensure the backend is running.'
            : 'An error occurred while fetching models.',
          variant: 'destructive',
        });
      } finally {
        setIsFetchingModels(false);
      }
    }

    fetchModels();
  }, [toast]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!input.trim() || !modelId) return;

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          message: input,
          memoryThreadId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Check if the response body is readable
      if (!response.body) {
        throw new Error('Response body is not readable');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseText = '';

      // Add assistant message placeholder
      const assistantMessageId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk and extract the text
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'text-delta') {
                responseText += data.text;

                // Update the assistant message with the accumulated text
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: responseText }
                      : msg
                  )
                );
              } else if (data.memoryThreadId) {
                // Save the memory thread ID for future messages
                setMemoryThreadId(data.memoryThreadId);
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Add an error message from the assistant
      const errorMessageId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: errorMessageId,
          role: 'assistant',
          content:
            "I'm sorry, I couldn't process your request. There was an error connecting to the AI service. Please try again later.",
        },
      ]);

      toast({
        title: 'Connection Error',
        description:
          'Failed to send message. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Interface</h1>
        <p className="text-muted-foreground">
          Test AI models with direct prompts
        </p>
      </div>

      {/* Error message */}
      {connectionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            Could not connect to the backend. Please check your connection and
            ensure the backend is running.
          </AlertDescription>
        </Alert>
      )}

      <Card className="flex flex-col h-[calc(100vh-220px)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Chat Interface</CardTitle>
            <Select
              value={modelId}
              onValueChange={setModelId}
              disabled={isFetchingModels}
            >
              <SelectTrigger className="w-[200px]">
                {isFetchingModels ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading models...
                  </div>
                ) : (
                  <SelectValue placeholder="Select a model" />
                )}
              </SelectTrigger>
              <SelectContent>
                {models && models.length > 0 ? (
                  models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-models" disabled>
                    No models available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            {memoryThreadId
              ? `Memory Thread ID: ${memoryThreadId}`
              : 'Test AI models with direct prompts'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  {connectionError
                    ? 'Could not connect to the backend. Please check your connection and try again.'
                    : 'No messages yet. Start a conversation!'}
                </p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading &&
              !messages.find(
                (m) => m.role === 'assistant' && m.content === ''
              ) && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                    <div className="flex space-x-2">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"></div>
                      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-75"></div>
                      <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        <CardFooter>
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <Textarea
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[60px]"
              disabled={isLoading || !modelId || models.length === 0}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !modelId || models.length === 0}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
