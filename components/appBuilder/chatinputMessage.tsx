'use client';
import React, { useState, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { parseCommand } from '@/lib/commandParser';
import { Input } from '@/components/ui/input';

interface ChatInputMessageProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// BEGIN: Add type alias for parsed command
type ParsedCommand =
  | { type: 'command'; command: string; args: string[] }
  | { type: 'text'; value: string };
// END: Add type alias for parsed command

const ChatInputMessage: React.FC<ChatInputMessageProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // BEGIN: Update parseSpecialCommand with explicit return type
  const parseSpecialCommand = (input: string): ParsedCommand => {
    if (
      input.startsWith('/') ||
      input.startsWith('@') ||
      input.startsWith('#')
    ) {
      // Simple parser: split by whitespace, first token is the command trigger
      const tokens = input.slice(1).trim().split(/\s+/);
      const command = tokens.shift() || '';
      return { type: 'command', command, args: tokens };
    }
    return { type: 'text', value: input };
  };
  // END: Update parseSpecialCommand with explicit return type

  const handleSend = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Use the imported parser to check for special command input
    const parsed = await parseCommand(input.trim());
    if (parsed.type === 'command') {
      // For demo purposes, we prepend a string; in a real system, integrate with NLP or command handlers
      onSend(
        `Command detected: ${parsed.command} with args: ${parsed.args.join(', ')}`
      );
    } else {
      onSend(input);
    }
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSend}
      className="flex items-center gap-2 w-full p-2 border-t border-border bg-zinc-950"
    >
      <Input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            handleSend(e as React.FormEvent);
          }
        }}
        className="flex-1 bg-transparent outline-none text-sm text-white placeholder-zinc-400 px-2 py-1"
      />
      <Button
        type="submit"
        size="icon-sm"
        variant="ghost"
        disabled={disabled || !input.trim()}
        aria-label="Send message"
      >
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
};

export default ChatInputMessage;
