# AI SDK UI: Stream Protocols
[AI SDK UI](https://ai-sdk.dev/docs/ai-sdk-ui)Stream Protocols

AI SDK UI functions such as `useChat` and `useCompletion` support both text streams and data streams. The stream protocol defines how the data is streamed to the frontend on top of the HTTP protocol.

This page describes both protocols and how to use them in the backend and frontend.

You can use this information to develop custom backends and frontends for your use case, e.g., to provide compatible API endpoints that are implemented in a different language such as Python.

For instance, here's an example using [FastAPI](https://github.com/vercel/ai/tree/main/examples/next-fastapi) as a backend.

[Text Stream Protocol](#text-stream-protocol)
---------------------------------------------

A text stream contains chunks in plain text, that are streamed to the frontend. Each chunk is then appended together to form a full text response.

Text streams are supported by `useChat`, `useCompletion`, and `useObject`. When you use `useChat` or `useCompletion`, you need to enable text streaming by setting the `streamProtocol` options to `text`.

You can generate text streams with `streamText` in the backend. When you call `toTextStreamResponse()` on the result object, a streaming HTTP response is returned.

Text streams only support basic text data. If you need to stream other types of data such as tool calls, use data streams.

### [Text Stream Example](#text-stream-example)

Here is a Next.js example that uses the text stream protocol:

```

'use client';
import { useCompletion } from '@ai-sdk/react';
export default function Page() {
  const { completion, input, handleInputChange, handleSubmit } = useCompletion({
    streamProtocol: 'text',
  });
  return (
    <form onSubmit={handleSubmit}>
      <input name="prompt" value={input} onChange={handleInputChange} />
      <button type="submit">Submit</button>
      <div>{completion}</div>
    </form>
  );
}
```


```

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export async function POST(req: Request) {
  const { prompt }: { prompt: string } = await req.json();
  const result = streamText({
    model: openai('gpt-4o'),
    prompt,
  });
  return result.toTextStreamResponse();
}
```


[Data Stream Protocol](#data-stream-protocol)
---------------------------------------------

A data stream follows a special protocol that the AI SDK provides to send information to the frontend.

Each stream part has the format `TYPE_ID:CONTENT_JSON\n`.

![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Fdata-stream-protocol.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Fdata-stream-protocol.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)

When you provide data streams from a custom backend, you need to set the `x-vercel-ai-data-stream` header to `v1`.

The following stream parts are currently supported:

### [Text Part](#text-part)

The text parts are appended to the message as they are received.

Format: `0:string\n`

Example: `0:"example"\n`

![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ftext-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ftext-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)

### [Reasoning Part](#reasoning-part)

The reasoning parts are appended to the message as they are received. The reasoning part is available through `reasoning`.

Format: `g:string\n`

Example: `g:"I will open the conversation with witty banter."\n`

### [Redacted Reasoning Part](#redacted-reasoning-part)

The redacted reasoning parts contain reasoning data that has been redacted. This is available through `redacted_reasoning`.

Format: `i:{"data": string}\n`

Example: `i:{"data": "This reasoning has been redacted for security purposes."}\n`

### [Reasoning Signature Part](#reasoning-signature-part)

The reasoning signature parts contain a signature associated with the reasoning. This is available through `reasoning_signature`.

Format: `j:{"signature": string}\n`

Example: `j:{"signature": "abc123xyz"}\n`

### [Source Part](#source-part)

The source parts are appended to the message as they are received. The source part is available through `source`.

Format: `h:Source\n`

Example: `h:{"sourceType":"url","id":"source-id","url":"https://example.com","title":"Example"}\n`

### [File Part](#file-part)

The file parts contain binary data encoded as base64 strings along with their MIME type. The file part is available through `file`.

Format: `k:{data:string; mimeType:string}\n`

Example: `k:{"data":"base64EncodedData","mimeType":"image/png"}\n`

### [Data Part](#data-part)

The data parts are parsed as JSON and appended to the data array as they are received. The data is available through `data`.

Format: `2:Array<JSONValue>\n`

Example: `2:[{"key":"object1"},{"anotherKey":"object2"}]\n`

![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Fdata-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Fdata-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)

### [Message Annotation Part](#message-annotation-part)

The message annotation parts are appended to the message as they are received. The annotation part is available through `annotations`.

Format: `8:Array<JSONValue>\n`

Example: `8:[{"id":"message-123","other":"annotation"}]\n`

### [Error Part](#error-part)

The error parts are appended to the message as they are received.

Format: `3:string\n`

Example: `3:"error message"\n`

![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ferror-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ferror-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)

### [Tool Call Streaming Start Part](#tool-call-streaming-start-part)

A part indicating the start of a streaming tool call. This part needs to be sent before any tool call delta for that tool call. Tool call streaming is optional, you can use tool call and tool result parts without it.

Format: `b:{toolCallId:string; toolName:string}\n`

Example: `b:{"toolCallId":"call-456","toolName":"streaming-tool"}\n`

![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ftool-call-streaming-start-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ftool-call-streaming-start-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)

### [Tool Call Delta Part](#tool-call-delta-part)

A part representing a delta update for a streaming tool call.

Format: `c:{toolCallId:string; argsTextDelta:string}\n`

Example: `c:{"toolCallId":"call-456","argsTextDelta":"partial arg"}\n`

![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ftool-call-delta-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ftool-call-delta-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)

### [Tool Call Part](#tool-call-part)

A part representing a tool call. When there are streamed tool calls, the tool call part needs to come after the tool call streaming is finished.

Format: `9:{toolCallId:string; toolName:string; args:object}\n`

Example: `9:{"toolCallId":"call-123","toolName":"my-tool","args":{"some":"argument"}}\n`

![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ftool-call-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ftool-call-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)

### [Tool Result Part](#tool-result-part)

A part representing a tool result. The result part needs to be sent after the tool call part for that tool call.

Format: `a:{toolCallId:string; result:object}\n`

Example: `a:{"toolCallId":"call-123","result":"tool output"}\n`

![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ftool-result-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ftool-result-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)

### [Start Step Part](#start-step-part)

A part indicating the start of a step.

It includes the following metadata:

*   `messageId` to indicate the id of the message that this step belongs to.

Format: `f:{messageId:string}\n`

Example: `f:{"messageId":"step_123"}\n`

### [Finish Step Part](#finish-step-part)

A part indicating that a step (i.e., one LLM API call in the backend) has been completed.

This part is necessary to correctly process multiple stitched assistant calls, e.g. when calling tools in the backend, and using steps in `useChat` at the same time.

It includes the following metadata:

*   [`FinishReason`](about:/docs/reference/ai-sdk-ui/use-chat#on-finish-finish-reason)
*   [`Usage`](about:/docs/reference/ai-sdk-ui/use-chat#on-finish-usage) for that step.
*   `isContinued` to indicate if the step text will be continued in the next step.

The finish step part needs to come at the end of a step.

Format: `e:{finishReason:'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other' | 'unknown';usage:{promptTokens:number; completionTokens:number;},isContinued:boolean}\n`

Example: `e:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":20},"isContinued":false}\n`

### [Finish Message Part](#finish-message-part)

A part indicating the completion of a message with additional metadata, such as [`FinishReason`](about:/docs/reference/ai-sdk-ui/use-chat#on-finish-finish-reason) and [`Usage`](about:/docs/reference/ai-sdk-ui/use-chat#on-finish-usage). This part needs to be the last part in the stream.

Format: `d:{finishReason:'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other' | 'unknown';usage:{promptTokens:number; completionTokens:number;}}\n`

Example: `d:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":20}}\n`

![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ffinish-message-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)![](https://ai-sdk.dev/_next/image?url=%2Fimages%2Ffinish-message-part.png&w=3840&q=75&dpl=dpl_EC4t1Vgd3Hma2Vc2YNBqAtALMn8h)

The data stream protocol is supported by `useChat` and `useCompletion` on the frontend and used by default. `useCompletion` only supports the `text` and `data` stream parts.

On the backend, you can use `toDataStreamResponse()` from the `streamText` result object to return a streaming HTTP response.

### [Data Stream Example](#data-stream-example)

Here is a Next.js example that uses the data stream protocol:

```

'use client';
import { useCompletion } from '@ai-sdk/react';
export default function Page() {
  const { completion, input, handleInputChange, handleSubmit } = useCompletion({
    streamProtocol: 'data', // optional, this is the default
  });
  return (
    <form onSubmit={handleSubmit}>
      <input name="prompt" value={input} onChange={handleInputChange} />
      <button type="submit">Submit</button>
      <div>{completion}</div>
    </form>
  );
}
```


```

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export async function POST(req: Request) {
  const { prompt }: { prompt: string } = await req.json();
  const result = streamText({
    model: openai('gpt-4o'),
    prompt,
  });
  return result.toDataStreamResponse();
}
```
