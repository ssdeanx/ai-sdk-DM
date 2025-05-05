# AI SDK Core: Transcription
[AI SDK Core](https://ai-sdk.dev/docs/ai-sdk-core)Transcription

Transcription is an experimental feature.

The AI SDK provides the [`transcribe`](https://ai-sdk.dev/docs/reference/ai-sdk-core/transcribe) function to transcribe audio using a transcription model.

```

import { experimental_transcribe as transcribe } from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFile } from 'fs/promises';
const transcript = await transcribe({
  model: openai.transcription('whisper-1'),
  audio: await readFile('audio.mp3'),
});
```


The `audio` property can be a `Uint8Array`, `ArrayBuffer`, `Buffer`, `string` (base64 encoded audio data), or a `URL`.

To access the generated transcript:

```

const text = transcript.text; // transcript text e.g. "Hello, world!"
const segments = transcript.segments; // array of segments with start and end times, if available
const language = transcript.language; // language of the transcript e.g. "en", if available
const durationInSeconds = transcript.durationInSeconds; // duration of the transcript in seconds, if available
```


[Settings](#settings)
---------------------

### [Provider-Specific settings](#provider-specific-settings)

Transcription models often have provider or model-specific settings which you can set using the `providerOptions` parameter.

```

import { experimental_transcribe as transcribe } from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFile } from 'fs/promises';
const transcript = await transcribe({
  model: openai.transcription('whisper-1'),
  audio: await readFile('audio.mp3'),
  providerOptions: {
    openai: {
      timestampGranularities: ['word'],
    },
  },
});
```


### [Abort Signals and Timeouts](#abort-signals-and-timeouts)

`transcribe` accepts an optional `abortSignal` parameter of type [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) that you can use to abort the transcription process or set a timeout.

```

import { openai } from '@ai-sdk/openai';
import { experimental_transcribe as transcribe } from 'ai';
import { readFile } from 'fs/promises';
const transcript = await transcribe({
  model: openai.transcription('whisper-1'),
  audio: await readFile('audio.mp3'),
  abortSignal: AbortSignal.timeout(1000), // Abort after 1 second
});
```


`transcribe` accepts an optional `headers` parameter of type `Record<string, string>` that you can use to add custom headers to the transcription request.

```

import { openai } from '@ai-sdk/openai';
import { experimental_transcribe as transcribe } from 'ai';
import { readFile } from 'fs/promises';
const transcript = await transcribe({
  model: openai.transcription('whisper-1'),
  audio: await readFile('audio.mp3'),
  headers: { 'X-Custom-Header': 'custom-value' },
});
```


### [Warnings](#warnings)

Warnings (e.g. unsupported parameters) are available on the `warnings` property.

```

import { openai } from '@ai-sdk/openai';
import { experimental_transcribe as transcribe } from 'ai';
import { readFile } from 'fs/promises';
const transcript = await transcribe({
  model: openai.transcription('whisper-1'),
  audio: await readFile('audio.mp3'),
});
const warnings = transcript.warnings;
```


### [Error Handling](#error-handling)

When `transcribe` cannot generate a valid transcript, it throws a [`AI_NoTranscriptGeneratedError`](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-no-transcript-generated-error).

This error can arise for any the following reasons:

*   The model failed to generate a response
*   The model generated a response that could not be parsed

The error preserves the following information to help you log the issue:

*   `responses`: Metadata about the transcription model responses, including timestamp, model, and headers.
*   `cause`: The cause of the error. You can use this for more detailed error handling.

```

import {
  experimental_transcribe as transcribe,
  NoTranscriptGeneratedError,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFile } from 'fs/promises';
try {
  await transcribe({
    model: openai.transcription('whisper-1'),
    audio: await readFile('audio.mp3'),
  });
} catch (error) {
  if (NoTranscriptGeneratedError.isInstance(error)) {
    console.log('NoTranscriptGeneratedError');
    console.log('Cause:', error.cause);
    console.log('Responses:', error.responses);
  }
}
```


[Transcription Models](#transcription-models)
---------------------------------------------

Above are a small subset of the transcription models supported by the AI SDK providers. For more, see the respective provider documentation.