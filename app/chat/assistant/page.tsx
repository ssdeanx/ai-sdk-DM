'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OpenAIAssistantChat } from '@/components/chat/openai-assistant-chat';

export default function AssistantChatPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold">OpenAI Assistant</h1>
          <p className="text-muted-foreground">
            Chat with an OpenAI Assistant using the AI SDK UI components
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="h-[calc(100vh-12rem)]">
            <CardContent className="p-0 h-full">
              <OpenAIAssistantChat 
                apiEndpoint="/api/assistant"
                className="h-full"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
