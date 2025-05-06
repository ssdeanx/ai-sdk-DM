'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AiSdkChat } from '@/components/chat/ai-sdk-chat';
import { Bot, Sparkles, Zap, MessageSquare, Loader2 } from 'lucide-react';

export default function AiSdkChatPage() {
  const [model, setModel] = useState('models/gemini-2.5-pro-preview-05-06');
  const [provider, setProvider] = useState('google');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(8192);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [enabledTools, setEnabledTools] = useState<string[]>(['web-search', 'weather', 'image-generation', 'data-visualization', 'browser-display']);
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const [structuredOutputEnabled, setStructuredOutputEnabled] = useState(true);
  const [toolChoice, setToolChoice] = useState<'auto' | 'none' | 'required'>('auto');
  const [isLoading, setIsLoading] = useState(false);

  // Handle provider change
  const handleProviderChange = (value: string) => {
    setIsLoading(true);
    setProvider(value);

    // Set default model based on provider
    switch (value) {
      case 'google':
        setModel('models/gemini-2.5-pro-preview-05-06');
        break;
      case 'openai':
        setModel('gpt-4o-2024-05-13');
        break;
      case 'anthropic':
        setModel('claude-3-5-sonnet');
        break;
      default:
        setModel('models/gemini-2.5-pro-preview-05-06');
    }

    // Simulate loading state for better UX
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  // Handle tool toggle
  const handleToolToggle = (toolId: string) => {
    setIsLoading(true);
    setEnabledTools(prev =>
      prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );

    // Simulate loading state for better UX
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">AI SDK Chat</h1>
          <p className="text-muted-foreground">
            Chat with AI models using the AI SDK UI components
          </p>
        </div>

        <Tabs defaultValue={provider} onValueChange={handleProviderChange}>
          <TabsList className="grid grid-cols-3 w-[400px]">
            <TabsTrigger value="google" className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-500" />
              Google AI
            </TabsTrigger>
            <TabsTrigger value="openai" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-500" />
              OpenAI
            </TabsTrigger>
            <TabsTrigger value="anthropic" className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              Anthropic
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            <div className="md:col-span-3">
              <Card className="h-[calc(100vh-12rem)]">
                <CardContent className="p-0 h-full relative">
                  {isLoading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading model...</p>
                      </div>
                    </div>
                  )}
                  <AiSdkChat
                    apiEndpoint="/api/chat/ai-sdk"
                    modelId={model}
                    provider={provider}
                    temperature={temperature}
                    maxTokens={maxTokens}
                    tools={enabledTools}
                    streamProtocol={streamingEnabled ? 'data' : 'text'}
                    toolChoice={toolChoice}
                    className="h-full"
                    systemPrompt={
                      `You are an AI assistant powered by ${model}. ${
                        thinkingEnabled ? 'Use thinking to work through complex problems step by step.' : ''
                      } ${
                        structuredOutputEnabled ? 'Provide structured, well-formatted responses.' : ''
                      }`
                    }
                  />
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Model Settings</CardTitle>
                  <CardDescription>
                    Configure the AI model and parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger id="model">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {provider === 'google' && (
                          <>
                            <SelectItem value="models/gemini-2.5-pro-preview-05-06">Gemini 2.5 Pro</SelectItem>
                            <SelectItem value="models/gemini-2.5-flash-preview-04-17">Gemini 2.5 Flash</SelectItem>
                            <SelectItem value="models/gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                            <SelectItem value="models/gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                          </>
                        )}
                        {provider === 'openai' && (
                          <>
                            <SelectItem value="gpt-4o-2024-05-13">GPT-4o (May 2024)</SelectItem>
                            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                          </>
                        )}
                        {provider === 'anthropic' && (
                          <>
                            <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                            <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                            <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                            <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="temperature">Temperature: {temperature.toFixed(1)}</Label>
                    </div>
                    <Slider
                      id="temperature"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[temperature]}
                      onValueChange={(value) => setTemperature(value[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower values produce more focused and deterministic responses.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="max-tokens">Max Tokens: {maxTokens}</Label>
                    </div>
                    <Slider
                      id="max-tokens"
                      min={1024}
                      max={32768}
                      step={1024}
                      value={[maxTokens]}
                      onValueChange={(value) => setMaxTokens(value[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of tokens to generate in the response.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="streaming">Enable Streaming</Label>
                    <Switch
                      id="streaming"
                      checked={streamingEnabled}
                      onCheckedChange={setStreamingEnabled}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Tools</CardTitle>
                  <CardDescription>
                    Enable or disable AI tools
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="web-search">Web Search</Label>
                    <Switch
                      id="web-search"
                      checked={enabledTools.includes('web-search')}
                      onCheckedChange={() => handleToolToggle('web-search')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="weather">Weather</Label>
                    <Switch
                      id="weather"
                      checked={enabledTools.includes('weather')}
                      onCheckedChange={() => handleToolToggle('weather')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="image-generation">Image Generation</Label>
                    <Switch
                      id="image-generation"
                      checked={enabledTools.includes('image-generation')}
                      onCheckedChange={() => handleToolToggle('image-generation')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="data-visualization">Data Visualization</Label>
                    <Switch
                      id="data-visualization"
                      checked={enabledTools.includes('data-visualization')}
                      onCheckedChange={() => handleToolToggle('data-visualization')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="browser-display">Browser Display</Label>
                    <Switch
                      id="browser-display"
                      checked={enabledTools.includes('browser-display')}
                      onCheckedChange={() => handleToolToggle('browser-display')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="computer-use">Computer Use</Label>
                    <Switch
                      id="computer-use"
                      checked={enabledTools.includes('computer-use')}
                      onCheckedChange={() => handleToolToggle('computer-use')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="code-interpreter">Code Interpreter</Label>
                    <Switch
                      id="code-interpreter"
                      checked={enabledTools.includes('code-interpreter')}
                      onCheckedChange={() => handleToolToggle('code-interpreter')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rag-search">RAG Search</Label>
                    <Switch
                      id="rag-search"
                      checked={enabledTools.includes('rag-search')}
                      onCheckedChange={() => handleToolToggle('rag-search')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                  <CardDescription>
                    Configure advanced model parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="thinking">Enable Thinking</Label>
                    <Switch
                      id="thinking"
                      checked={thinkingEnabled}
                      onCheckedChange={setThinkingEnabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="structured-output">Structured Output</Label>
                    <Switch
                      id="structured-output"
                      checked={structuredOutputEnabled}
                      onCheckedChange={setStructuredOutputEnabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tool-choice">Tool Choice</Label>
                    <Select value={toolChoice} onValueChange={(value) => setToolChoice(value as 'auto' | 'none' | 'required')}>
                      <SelectTrigger id="tool-choice" className="w-[120px]">
                        <SelectValue placeholder="Tool Choice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="required">Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>

        <div className="flex justify-center gap-4 mt-4">
          <Button variant="outline" asChild>
            <a href="/chat/assistant" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Try OpenAI Assistant
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/demo-chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Try Demo Chat
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
