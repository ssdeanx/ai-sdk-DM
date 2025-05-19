import type { Message } from '../../db/libsql/validation';

// A function that transforms a message array
export type MessageProcessor = (messages: Message[]) => Message[];

// Example: keep only the last N messages
export function pruneOldMessages(maxMessages: number): MessageProcessor {
  return (messages) => {
    if (messages.length <= maxMessages) return messages;
    return messages.slice(messages.length - maxMessages);
  };
}

// Example: filter messages by role(s)
export function filterMessagesByRole(
  allowedRoles: Message['role'][]
): MessageProcessor {
  return (messages) => messages.filter((m) => allowedRoles.includes(m.role));
}

// Pipeline to apply processors in sequence
export class MemoryProcessorPipeline {
  private processors: MessageProcessor[] = [];

  constructor(initial?: MessageProcessor[]) {
    if (initial) this.processors = initial;
  }

  add(processor: MessageProcessor): this {
    this.processors.push(processor);
    return this;
  }

  run(messages: Message[]): Message[] {
    return this.processors.reduce((acc, proc) => proc(acc), messages);
  }
}
