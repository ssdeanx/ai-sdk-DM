'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { EnhancedChat } from '@/components/chat/enhanced-chat';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const threadId = searchParams.get('thread');
  const agentId = searchParams.get('agent');
  const [defaultModelId, setDefaultModelId] = useState<string>('');

  // Fetch default model ID from settings
  useEffect(() => {
    const fetchDefaultModel = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();

        if (data?.api?.default_model_id) {
          setDefaultModelId(data.api.default_model_id);
        }
      } catch (error) {
        console.error('Error fetching default model:', error);
      }
    };

    fetchDefaultModel();
  }, []);

  return (
    <EnhancedChat
      initialThreadId={threadId || undefined}
      initialModelId={defaultModelId}
      agentId={agentId || undefined}
    />
  );
}
