import { NlpManager } from '@nlpjs/nlp';

// Define the ParsedCommand type
export type ParsedCommand =
  | { type: 'command'; command: string; args: string[] }
  | { type: 'text'; value: string };

let nlpManager: NlpManager | null = null;

// Initialize the NLP manager with example training data
export async function initNlpManager(): Promise<NlpManager> {
  if (!nlpManager) {
    nlpManager = new NlpManager({ languages: ['en'] });
    // Add training examples for commands
    nlpManager.addDocument('en', '/help', 'command.help');
    nlpManager.addDocument('en', '/search %query%', 'command.search');
    // You can add more command examples as needed
    await nlpManager.train();
  }
  return nlpManager;
}

// Advanced parser using @nlpjs/nlp
export async function parseCommandWithNlp(
  input: string
): Promise<ParsedCommand> {
  if (!nlpManager) {
    await initNlpManager();
  }
  const result = await nlpManager!.process('en', input);
  if (result.intent && result.score > 0.7) {
    // Extract the command name (e.g., 'help' from 'command.help')
    const command = result.intent.replace('command.', '');
    // For demonstration, we don't extract arguments here
    return { type: 'command', command, args: [] };
  }
  return { type: 'text', value: input };
}

// Simple parser using regex for commands starting with special characters
export function parseCommandSimple(input: string): ParsedCommand {
  if (input.startsWith('/') || input.startsWith('@') || input.startsWith('#')) {
    const tokens = input.slice(1).trim().split(/\s+/);
    const command = tokens.shift() || '';
    return { type: 'command', command, args: tokens };
  }
  return { type: 'text', value: input };
}

// Main function to parse a command using either NLP or the simple parser
// By default, it uses the simple parser. To use NLP, set useNlp to true.
export async function parseCommand(
  input: string,
  useNlp: boolean = false
): Promise<ParsedCommand> {
  if (useNlp) {
    return await parseCommandWithNlp(input);
  } else {
    return parseCommandSimple(input);
  }
}
