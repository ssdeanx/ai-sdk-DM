'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EnhancedChat } from '@/components/chat/enhanced-chat';
import { AiSdkChat } from '@/components/chat/ai-sdk-chat';

export default function DemoChatPage() {
  const [activeTab, setActiveTab] = useState('enhanced');

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold">Demo Chat</h1>
            <p className="text-muted-foreground">
              Interact with AI models using different chat interfaces
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link href="/chat">
                Main Chat
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/chat/ai-sdk">
                AI SDK Chat
              </Link>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid grid-cols-2 w-[400px]">
            <TabsTrigger value="enhanced">Enhanced Chat</TabsTrigger>
            <TabsTrigger value="ai-sdk">AI SDK Chat</TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="enhanced" className="m-0">
              <Card className="h-[calc(100vh-12rem)]">
                <CardContent className="p-0 h-full">
                  <EnhancedChat className="h-full" />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="ai-sdk" className="m-0">
              <Card className="h-[calc(100vh-12rem)]">
                <CardContent className="p-0 h-full">
                  <AiSdkChat className="h-full" />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
