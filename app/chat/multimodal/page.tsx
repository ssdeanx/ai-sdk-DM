import { MultimodalChat } from '@/components/chat/multimodal-chat';

export const metadata = {
  title: 'Multimodal Chat',
  description: 'Chat with AI using text and images',
};

export default function MultimodalChatPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <MultimodalChat />
      </div>
    </div>
  );
}
