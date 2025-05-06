import { RagChat } from '@/components/chat/rag-chat';

export const metadata = {
  title: 'RAG Chat',
  description: 'Chat with AI using Retrieval-Augmented Generation',
};

export default function RagChatPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <RagChat />
      </div>
    </div>
  );
}
