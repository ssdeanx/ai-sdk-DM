// components/appBuilder/appBuilderContainer.tsx
import React, { useState } from 'react';
import { ChatBar, Message } from './chatBar'; // Assuming ChatBar is updated to use @ai-sdk/react and exports Message
import { CanvasDisplay } from './canvasDisplay'; // Assuming CanvasDisplay is updated with CodeMirror
import { Button } from '@/components/ui/button'; // Assuming you have a Button component

export function AppBuilderContainer() {
  const [canvasMode, setCanvasMode] = useState<'terminal' | 'canvas' | 'code'>('terminal');
  const [canvasContent, setCanvasContent] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]); // State to potentially manage chat history externally if needed

  // Function to analyze AI message and update canvas display
  const handleAssistantMessage = (assistantMessage: string, fullResponse?: Message) => {
    console.log("Assistant message received:", assistantMessage);

    // Update chat messages state (optional, if you want to manage history here)
    // setChatMessages((prev) => [...prev, fullResponse].filter(Boolean) as Message[]);

    // Basic logic to determine canvas mode based on message content
    // This is a simple example; more sophisticated parsing might be needed
    if (assistantMessage.includes('```typescript') || assistantMessage.includes('```javascript') || assistantMessage.includes('```json')) {
      setCanvasMode('code');
      // Extract code block - this is a simplified regex example
      const codeMatch = assistantMessage.match(/```(typescript|javascript|json)\n([\s\S]*?)```/);
      if (codeMatch && codeMatch[2]) {
        setCanvasContent(codeMatch[2].trim());
      } else {
        setCanvasContent(assistantMessage); // Fallback to full message if extraction fails
      }
    } else if (assistantMessage.includes('$ ') || assistantMessage.includes('> ')) { // Simple check for command prompts
       setCanvasMode('terminal');
       setCanvasContent(assistantMessage);
    }
     else {
      setCanvasMode('terminal'); // Default to terminal for other messages
      setCanvasContent(assistantMessage);
    }

    // You could also use the fullResponse object for more structured data if your API provides it
    // if (fullResponse?.toolCalls) { ... }
  };

  const handleClearCanvas = () => {
    setCanvasContent('');
    setCanvasMode('terminal'); // Reset to default mode
  };

  const handleClearChat = () => {
    // This would require a way to clear messages in the ChatBar,
    // which might involve passing a function down or resetting initialMessages.
    // If using useChat, you might need to reset its internal state or key the component.
    console.log("Clear chat functionality to be implemented in ChatBar");
    // For now, we'll just log. Clearing useChat state directly isn't straightforward.
    // A potential approach is to re-mount the ChatBar component with an empty initialMessages array.
  };


  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden p-4">
        {/* Other app builder components could go here */}
        <div className="mb-4 flex justify-end gap-2">
             <Button onClick={handleClearCanvas} variant="outline" size="sm">Clear Canvas</Button>
             {/* Clear Chat button - functionality needs implementation in ChatBar */}
             {/* <Button onClick={handleClearChat} variant="outline" size="sm">Clear Chat</Button> */}
        </div>
        <CanvasDisplay mode={canvasMode} content={canvasContent} className="h-full" />
      </div>
      <div className="p-4 border-t bg-background">
         <ChatBar onMessageSend={handleAssistantMessage} />
      </div>
    </div>
  );
}
