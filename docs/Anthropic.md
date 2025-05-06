# AI SDK Providers: Anthropic
[AI SDK Providers](https://ai-sdk.dev/providers/ai-sdk-providers)Anthropic

[Anthropic Provider](#anthropic-provider)
-----------------------------------------

The [Anthropic](https://www.anthropic.com/) provider contains language model support for the [Anthropic Messages API](https://docs.anthropic.com/claude/reference/messages_post).

[Setup](#setup)
---------------

The Anthropic provider is available in the `@ai-sdk/anthropic` module. You can install it with

```
pnpm add @ai-sdk/anthropic
```


[Provider Instance](#provider-instance)
---------------------------------------

You can import the default provider instance `anthropic` from `@ai-sdk/anthropic`:

```

import { anthropic } from '@ai-sdk/anthropic';
```


If you need a customized setup, you can import `createAnthropic` from `@ai-sdk/anthropic` and create a provider instance with your settings:

```

import { createAnthropic } from '@ai-sdk/anthropic';
const anthropic = createAnthropic({
  // custom settings
});
```


You can use the following optional settings to customize the Anthropic provider instance:

*   **baseURL** _string_
    
    Use a different URL prefix for API calls, e.g. to use proxy servers. The default prefix is `https://api.anthropic.com/v1`.
    
*   **apiKey** _string_
    
    API key that is being sent using the `x-api-key` header. It defaults to the `ANTHROPIC_API_KEY` environment variable.
    
*   **headers** _Record<string,string>_
    
    Custom headers to include in the requests.
    
*   **fetch** _(input: RequestInfo, init?: RequestInit) => Promise<Response>_
    
    Custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) implementation. Defaults to the global `fetch` function. You can use it as a middleware to intercept requests, or to provide a custom fetch implementation for e.g. testing.
    

[Language Models](#language-models)
-----------------------------------

You can create models that call the [Anthropic Messages API](https://docs.anthropic.com/claude/reference/messages_post) using the provider instance. The first argument is the model id, e.g. `claude-3-haiku-20240307`. Some models have multi-modal capabilities.

```

const model = anthropic('claude-3-haiku-20240307');
```


You can use Anthropic language models to generate text with the `generateText` function:

```

import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
const { text } = await generateText({
  model: anthropic('claude-3-haiku-20240307'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```


Anthropic language models can also be used in the `streamText`, `generateObject`, and `streamObject` functions (see [AI SDK Core](https://ai-sdk.dev/docs/ai-sdk-core)).

The Anthropic API returns streaming tool calls all at once after a delay. This causes the `streamObject` function to generate the object fully after a delay instead of streaming it incrementally.

The following optional settings are available for Anthropic models:

*   `sendReasoning` _boolean_
    
    Optional. Include reasoning content in requests sent to the model. Defaults to `true`.
    
    If you are experiencing issues with the model handling requests involving reasoning content, you can set this to `false` to omit them from the request.
    

### [Reasoning](#reasoning)

Anthropic has reasoning support for the `claude-3-7-sonnet-20250219` model.

You can enable it using the `thinking` provider option and specifying a thinking budget in tokens.

```

import { anthropic, AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
const { text, reasoning, reasoningDetails } = await generateText({
  model: anthropic('claude-3-7-sonnet-20250219'),
  prompt: 'How many people will live in the world in 2040?',
  providerOptions: {
    anthropic: {
      thinking: { type: 'enabled', budgetTokens: 12000 },
    } satisfies AnthropicProviderOptions,
  },
});
console.log(reasoning); // reasoning text
console.log(reasoningDetails); // reasoning details including redacted reasoning
console.log(text); // text response
```


See [AI SDK UI: Chatbot](about:/docs/ai-sdk-ui/chatbot#reasoning) for more details on how to integrate reasoning into your chatbot.

### [Cache Control](#cache-control)

Anthropic cache control was originally a beta feature and required passing an opt-in `cacheControl` setting when creating the model instance. It is now Generally Available and enabled by default. The `cacheControl` setting is no longer needed and will be removed in a future release.

In the messages and message parts, you can use the `providerOptions` property to set cache control breakpoints. You need to set the `anthropic` property in the `providerOptions` object to `{ cacheControl: { type: 'ephemeral' } }` to set a cache control breakpoint.

The cache creation input tokens are then returned in the `providerMetadata` object for `generateText` and `generateObject`, again under the `anthropic` property. When you use `streamText` or `streamObject`, the response contains a promise that resolves to the metadata. Alternatively you can receive it in the `onFinish` callback.

```

import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
const errorMessage = '... long error message ...';
const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20240620'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'You are a JavaScript expert.' },
        {
          type: 'text',
          text: `Error message: ${errorMessage}`,
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        { type: 'text', text: 'Explain the error message.' },
      ],
    },
  ],
});
console.log(result.text);
console.log(result.providerMetadata?.anthropic);
// e.g. { cacheCreationInputTokens: 2118, cacheReadInputTokens: 0 }
```


You can also use cache control on system messages by providing multiple system messages at the head of your messages array:

```

const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20240620'),
  messages: [
    {
      role: 'system',
      content: 'Cached system message part',
      providerOptions: {
        anthropic: { cacheControl: { type: 'ephemeral' } },
      },
    },
    {
      role: 'system',
      content: 'Uncached system message part',
    },
    {
      role: 'user',
      content: 'User prompt',
    },
  ],
});
```


The minimum cacheable prompt length is:

*   1024 tokens for Claude 3.7 Sonnet, Claude 3.5 Sonnet and Claude 3 Opus
*   2048 tokens for Claude 3.5 Haiku and Claude 3 Haiku

Shorter prompts cannot be cached, even if marked with `cacheControl`. Any requests to cache fewer than this number of tokens will be processed without caching.

For more on prompt caching with Anthropic, see [Anthropic's Cache Control documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching).

Because the `UIMessage` type (used by AI SDK UI hooks like `useChat`) does not support the `providerOptions` property, you can use `convertToCoreMessages` first before passing the messages to functions like `generateText` or `streamText`. For more details on `providerOptions` usage, see [here](about:/docs/foundations/prompts#provider-options).

### [Computer Use](#computer-use)

Anthropic provides three built-in tools that can be used to interact with external systems:

1.  **Bash Tool**: Allows running bash commands.
2.  **Text Editor Tool**: Provides functionality for viewing and editing text files.
3.  **Computer Tool**: Enables control of keyboard and mouse actions on a computer.

They are available via the `tools` property of the provider instance.

#### [Bash Tool](#bash-tool)

The Bash Tool allows running bash commands. Here's how to create and use it:

```

const bashTool = anthropic.tools.bash_20241022({
  execute: async ({ command, restart }) => {
    // Implement your bash command execution logic here
    // Return the result of the command execution
  },
});
```


Parameters:

*   `command` (string): The bash command to run. Required unless the tool is being restarted.
*   `restart` (boolean, optional): Specifying true will restart this tool.

#### [Text Editor Tool](#text-editor-tool)

The Text Editor Tool provides functionality for viewing and editing text files:

```

const textEditorTool = anthropic.tools.textEditor_20241022({
  execute: async ({
    command,
    path,
    file_text,
    insert_line,
    new_str,
    old_str,
    view_range,
  }) => {
    // Implement your text editing logic here
    // Return the result of the text editing operation
  },
});
```


Parameters:

*   `command` ('view' | 'create' | 'str\_replace' | 'insert' | 'undo\_edit'): The command to run.
*   `path` (string): Absolute path to file or directory, e.g. `/repo/file.py` or `/repo`.
*   `file_text` (string, optional): Required for `create` command, with the content of the file to be created.
*   `insert_line` (number, optional): Required for `insert` command. The line number after which to insert the new string.
*   `new_str` (string, optional): New string for `str_replace` or `insert` commands.
*   `old_str` (string, optional): Required for `str_replace` command, containing the string to replace.
*   `view_range` (number\[\], optional): Optional for `view` command to specify line range to show.

When using the Text Editor Tool, make sure to name the key in the tools object `str_replace_editor`.

```

const response = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  prompt:
    "Create a new file called example.txt, write 'Hello World' to it, and run 'cat example.txt' in the terminal",
  tools: {
    str_replace_editor: textEditorTool,
  },
});
```


#### [Computer Tool](#computer-tool)

The Computer Tool enables control of keyboard and mouse actions on a computer:

```

const computerTool = anthropic.tools.computer_20241022({
  displayWidthPx: 1920,
  displayHeightPx: 1080,
  displayNumber: 0, // Optional, for X11 environments
  execute: async ({ action, coordinate, text }) => {
    // Implement your computer control logic here
    // Return the result of the action
    // Example code:
    switch (action) {
      case 'screenshot': {
        // multipart result:
        return {
          type: 'image',
          data: fs
            .readFileSync('./data/screenshot-editor.png')
            .toString('base64'),
        };
      }
      default: {
        console.log('Action:', action);
        console.log('Coordinate:', coordinate);
        console.log('Text:', text);
        return `executed ${action}`;
      }
    }
  },
  // map to tool result content for LLM consumption:
  experimental_toToolResultContent(result) {
    return typeof result === 'string'
      ? [{ type: 'text', text: result }]
      : [{ type: 'image', data: result.data, mimeType: 'image/png' }];
  },
});
```


Parameters:

*   `action` ('key' | 'type' | 'mouse\_move' | 'left\_click' | 'left\_click\_drag' | 'right\_click' | 'middle\_click' | 'double\_click' | 'screenshot' | 'cursor\_position'): The action to perform.
*   `coordinate` (number\[\], optional): Required for `mouse_move` and `left_click_drag` actions. Specifies the (x, y) coordinates.
*   `text` (string, optional): Required for `type` and `key` actions.

These tools can be used in conjunction with the `sonnet-3-5-sonnet-20240620` model to enable more complex interactions and tasks.

### [PDF support](#pdf-support)

Anthropic Sonnet `claude-3-5-sonnet-20241022` supports reading PDF files. You can pass PDF files as part of the message content using the `file` type:

Option 1: URL-based PDF document

```

const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'What is an embedding model according to this document?',
        },
        {
          type: 'file',
          data: new URL(
            'https://github.com/vercel/ai/blob/main/examples/ai-core/data/ai.pdf?raw=true',
          ),
          mimeType: 'application/pdf',
        },
      ],
    },
  ],
});
```


Option 2: Base64-encoded PDF document

```

const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'What is an embedding model according to this document?',
        },
        {
          type: 'file',
          data: fs.readFileSync('./data/ai.pdf'),
          mimeType: 'application/pdf',
        },
      ],
    },
  ],
});
```


The model will have access to the contents of the PDF file and respond to questions about it. The PDF file should be passed using the `data` field, and the `mimeType` should be set to `'application/pdf'`.

### [Model Capabilities](#model-capabilities)


|Model                     |Image Input|Object Generation|Tool Usage|Computer Use|
|--------------------------|-----------|-----------------|----------|------------|
|claude-3-7-sonnet-20250219|           |                 |          |            |
|claude-3-5-sonnet-20241022|           |                 |          |            |
|claude-3-5-sonnet-20240620|           |                 |          |            |
|claude-3-5-haiku-20241022 |           |                 |          |            |
|claude-3-opus-20240229    |           |                 |          |            |
|claude-3-sonnet-20240229  |           |                 |          |            |
|claude-3-haiku-20240307   |           |                 |          |            |


The table above lists popular models. Please see the [Anthropic docs](https://docs.anthropic.com/en/docs/about-claude/models) for a full list of available models. The table above lists popular models. You can also pass any available provider model ID as a string if needed.