'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { AiSdkChat } from '@/components/chat/ai-sdk-chat';

export default function AiSdkChatPage() {
  const [model, setModel] = useState('gemini-1.5-pro');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [streamingEnabled, setStreamingEnabled] = useState(true);

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">AI SDK Chat</h1>
          <p className="text-muted-foreground">
            Chat with AI models using the AI SDK UI components
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <Card className="h-[calc(100vh-12rem)]">
              <CardContent className="p-0 h-full">
                <AiSdkChat 
                  apiEndpoint="/api/chat"
                  className="h-full"
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
                      <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                      <SelectItem value="llama-3-70b">Llama 3 70B</SelectItem>
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
                    min={256}
                    max={4096}
                    step={256}
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

            <Card>
              <CardHeader>
                <CardTitle>Tools</CardTitle>
                <CardDescription>
                  Enable or disable AI tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="web-search">Web Search</Label>
                  <Switch id="web-search" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="code-interpreter">Code Interpreter</Label>
                  <Switch id="code-interpreter" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="image-generation">Image Generation</Label>
                  <Switch id="image-generation" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="file-upload">File Upload</Label>
                  <Switch id="file-upload" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
