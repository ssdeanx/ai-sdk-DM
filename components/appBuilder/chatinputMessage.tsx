import React, { useState, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ChatInputMessageProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInputMessage: React.FC<ChatInputMessageProps> = ({ onSend, disabled = false, placeholder = "Type a message..." }) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSend} className="flex items-center gap-2 w-full p-2 border-t border-border bg-zinc-950">
      <input
        ref={inputRef}
        type="text"
        className="flex-1 bg-transparent outline-none text-sm text-white placeholder-zinc-400 px-2 py-1"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      <Button type="submit" size="icon-sm" variant="ghost" disabled={disabled || !input.trim()} aria-label="Send message">
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
};

export default ChatInputMessage;
