# AI SDK Core: Image Generation
[AI SDK Core](https://ai-sdk.dev/docs/ai-sdk-core)Image Generation

Image generation is an experimental feature.

The AI SDK provides the [`generateImage`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-image) function to generate images based on a given prompt using an image model.

```

import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';
const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Santa Claus driving a Cadillac',
});
```


You can access the image data using the `base64` or `uint8Array` properties:

```

const base64 = image.base64; // base64 image data
const uint8Array = image.uint8Array; // Uint8Array image data
```


[Settings](#settings)
---------------------

### [Size and Aspect Ratio](#size-and-aspect-ratio)

Depending on the model, you can either specify the size or the aspect ratio.

##### [Size](#size)

The size is specified as a string in the format `{width}x{height}`. Models only support a few sizes, and the supported sizes are different for each model and provider.

```

import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';
const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Santa Claus driving a Cadillac',
  size: '1024x1024',
});
```


##### [Aspect Ratio](#aspect-ratio)

The aspect ratio is specified as a string in the format `{width}:{height}`. Models only support a few aspect ratios, and the supported aspect ratios are different for each model and provider.

```

import { experimental_generateImage as generateImage } from 'ai';
import { vertex } from '@ai-sdk/google-vertex';
const { image } = await generateImage({
  model: vertex.image('imagen-3.0-generate-002'),
  prompt: 'Santa Claus driving a Cadillac',
  aspectRatio: '16:9',
});
```


### [Generating Multiple Images](#generating-multiple-images)

`generateImage` also supports generating multiple images at once:

```

import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';
const { images } = await generateImage({
  model: openai.image('dall-e-2'),
  prompt: 'Santa Claus driving a Cadillac',
  n: 4, // number of images to generate
});
```


`generateImage` will automatically call the model as often as needed (in parallel) to generate the requested number of images.

Each image model has an internal limit on how many images it can generate in a single API call. The AI SDK manages this automatically by batching requests appropriately when you request multiple images using the `n` parameter. By default, the SDK uses provider-documented limits (for example, DALL-E 3 can only generate 1 image per call, while DALL-E 2 supports up to 10).

If needed, you can override this behavior using the `maxImagesPerCall` setting when configuring your model. This is particularly useful when working with new or custom models where the default batch size might not be optimal:

```

const model = openai.image('dall-e-2', {
  maxImagesPerCall: 5, // Override the default batch size
});
const { images } = await generateImage({
  model,
  prompt: 'Santa Claus driving a Cadillac',
  n: 10, // Will make 2 calls of 5 images each
});
```


### [Providing a Seed](#providing-a-seed)

You can provide a seed to the `generateImage` function to control the output of the image generation process. If supported by the model, the same seed will always produce the same image.

```

import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';
const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Santa Claus driving a Cadillac',
  seed: 1234567890,
});
```


### [Provider-specific Settings](#provider-specific-settings)

Image models often have provider- or even model-specific settings. You can pass such settings to the `generateImage` function using the `providerOptions` parameter. The options for the provider (`openai` in the example below) become request body properties.

```

import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';
const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Santa Claus driving a Cadillac',
  size: '1024x1024',
  providerOptions: {
    openai: { style: 'vivid', quality: 'hd' },
  },
});
```


### [Abort Signals and Timeouts](#abort-signals-and-timeouts)

`generateImage` accepts an optional `abortSignal` parameter of type [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) that you can use to abort the image generation process or set a timeout.

```

import { openai } from '@ai-sdk/openai';
import { experimental_generateImage as generateImage } from 'ai';
const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Santa Claus driving a Cadillac',
  abortSignal: AbortSignal.timeout(1000), // Abort after 1 second
});
```


`generateImage` accepts an optional `headers` parameter of type `Record<string, string>` that you can use to add custom headers to the image generation request.

```

import { openai } from '@ai-sdk/openai';
import { experimental_generateImage as generateImage } from 'ai';
const { image } = await generateImage({
  model: openai.image('dall-e-3'),
  value: 'sunny day at the beach',
  headers: { 'X-Custom-Header': 'custom-value' },
});
```


### [Warnings](#warnings)

If the model returns warnings, e.g. for unsupported parameters, they will be available in the `warnings` property of the response.

```

const { image, warnings } = await generateImage({
  model: openai.image('dall-e-3'),
  prompt: 'Santa Claus driving a Cadillac',
});
```


### [Error Handling](#error-handling)

When `generateImage` cannot generate a valid image, it throws a [`AI_NoImageGeneratedError`](https://ai-sdk.dev/docs/reference/ai-sdk-errors/ai-no-image-generated-error).

This error occurs when the AI provider fails to generate an image. It can arise due to the following reasons:

*   The model failed to generate a response
*   The model generated a response that could not be parsed

The error preserves the following information to help you log the issue:

*   `responses`: Metadata about the image model responses, including timestamp, model, and headers.
*   `cause`: The cause of the error. You can use this for more detailed error handling

```

import { generateImage, NoImageGeneratedError } from 'ai';
try {
  await generateImage({ model, prompt });
} catch (error) {
  if (NoImageGeneratedError.isInstance(error)) {
    console.log('NoImageGeneratedError');
    console.log('Cause:', error.cause);
    console.log('Responses:', error.responses);
  }
}
```


[Generating Images with Language Models](#generating-images-with-language-models)
---------------------------------------------------------------------------------

Some language models such as Google `gemini-2.0-flash-exp` support multi-modal outputs including images. With such models, you can access the generated images using the `files` property of the response.

```

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
const result = await generateText({
  model: google('gemini-2.0-flash-exp'),
  providerOptions: {
    google: { responseModalities: ['TEXT', 'IMAGE'] },
  },
  prompt: 'Generate an image of a comic cat',
});
for (const file of result.files) {
  if (file.mimeType.startsWith('image/')) {
    // The file object provides multiple data formats:
    // Access images as base64 string, Uint8Array binary data, or check type
    // - file.base64: string (data URL format)
    // - file.uint8Array: Uint8Array (binary data)
    // - file.mimeType: string (e.g. "image/png")
  }
}
```


[Image Models](#image-models)
-----------------------------



* Provider: xAI Grok
  * Model: grok-2-image
  * Support sizes (width x height) or aspect ratios (width : height): 1024x768 (default)
* Provider: OpenAI
  * Model: gpt-image-1
  * Support sizes (width x height) or aspect ratios (width : height): 1024x1024, 1536x1024, 1024x1536
* Provider: OpenAI
  * Model: dall-e-3
  * Support sizes (width x height) or aspect ratios (width : height): 1024x1024, 1792x1024, 1024x1792
* Provider: OpenAI
  * Model: dall-e-2
  * Support sizes (width x height) or aspect ratios (width : height): 256x256, 512x512, 1024x1024
* Provider: Amazon Bedrock
  * Model: amazon.nova-canvas-v1:0
  * Support sizes (width x height) or aspect ratios (width : height): 320-4096 (multiples of 16), 1:4 to 4:1, max 4.2M pixels
* Provider: Fal
  * Model: fal-ai/flux/dev
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9
* Provider: Fal
  * Model: fal-ai/flux-lora
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9
* Provider: Fal
  * Model: fal-ai/fast-sdxl
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9
* Provider: Fal
  * Model: fal-ai/flux-pro/v1.1-ultra
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9
* Provider: Fal
  * Model: fal-ai/ideogram/v2
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9
* Provider: Fal
  * Model: fal-ai/recraft-v3
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9
* Provider: Fal
  * Model: fal-ai/stable-diffusion-3.5-large
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9
* Provider: Fal
  * Model: fal-ai/hyper-sdxl
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9
* Provider: DeepInfra
  * Model: stabilityai/sd3.5
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 16:9, 1:9, 3:2, 2:3, 4:5, 5:4, 9:16, 9:21
* Provider: DeepInfra
  * Model: black-forest-labs/FLUX-1.1-pro
  * Support sizes (width x height) or aspect ratios (width : height): 256-1440 (multiples of 32)
* Provider: DeepInfra
  * Model: black-forest-labs/FLUX-1-schnell
  * Support sizes (width x height) or aspect ratios (width : height): 256-1440 (multiples of 32)
* Provider: DeepInfra
  * Model: black-forest-labs/FLUX-1-dev
  * Support sizes (width x height) or aspect ratios (width : height): 256-1440 (multiples of 32)
* Provider: DeepInfra
  * Model: black-forest-labs/FLUX-pro
  * Support sizes (width x height) or aspect ratios (width : height): 256-1440 (multiples of 32)
* Provider: DeepInfra
  * Model: stabilityai/sd3.5-medium
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 16:9, 1:9, 3:2, 2:3, 4:5, 5:4, 9:16, 9:21
* Provider: DeepInfra
  * Model: stabilityai/sdxl-turbo
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 16:9, 1:9, 3:2, 2:3, 4:5, 5:4, 9:16, 9:21
* Provider: Replicate
  * Model: black-forest-labs/flux-schnell
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 2:3, 3:2, 4:5, 5:4, 16:9, 9:16, 9:21, 21:9
* Provider: Replicate
  * Model: recraft-ai/recraft-v3
  * Support sizes (width x height) or aspect ratios (width : height): 1024x1024, 1365x1024, 1024x1365, 1536x1024, 1024x1536, 1820x1024, 1024x1820, 1024x2048, 2048x1024, 1434x1024, 1024x1434, 1024x1280, 1280x1024, 1024x1707, 1707x1024
* Provider: Google Vertex
  * Model: imagen-3.0-generate-002
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9
* Provider: Google Vertex
  * Model: imagen-3.0-fast-generate-001
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9
* Provider: Fireworks
  * Model: accounts/fireworks/models/flux-1-dev-fp8
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 2:3, 3:2, 4:5, 5:4, 16:9, 9:16, 9:21, 21:9
* Provider: Fireworks
  * Model: accounts/fireworks/models/flux-1-schnell-fp8
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 2:3, 3:2, 4:5, 5:4, 16:9, 9:16, 9:21, 21:9
* Provider: Fireworks
  * Model: accounts/fireworks/models/playground-v2-5-1024px-aesthetic
  * Support sizes (width x height) or aspect ratios (width : height): 640x1536, 768x1344, 832x1216, 896x1152, 1024x1024, 1152x896, 1216x832, 1344x768, 1536x640
* Provider: Fireworks
  * Model: accounts/fireworks/models/japanese-stable-diffusion-xl
  * Support sizes (width x height) or aspect ratios (width : height): 640x1536, 768x1344, 832x1216, 896x1152, 1024x1024, 1152x896, 1216x832, 1344x768, 1536x640
* Provider: Fireworks
  * Model: accounts/fireworks/models/playground-v2-1024px-aesthetic
  * Support sizes (width x height) or aspect ratios (width : height): 640x1536, 768x1344, 832x1216, 896x1152, 1024x1024, 1152x896, 1216x832, 1344x768, 1536x640
* Provider: Fireworks
  * Model: accounts/fireworks/models/SSD-1B
  * Support sizes (width x height) or aspect ratios (width : height): 640x1536, 768x1344, 832x1216, 896x1152, 1024x1024, 1152x896, 1216x832, 1344x768, 1536x640
* Provider: Fireworks
  * Model: accounts/fireworks/models/stable-diffusion-xl-1024-v1-0
  * Support sizes (width x height) or aspect ratios (width : height): 640x1536, 768x1344, 832x1216, 896x1152, 1024x1024, 1152x896, 1216x832, 1344x768, 1536x640
* Provider: Luma
  * Model: photon-1
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9
* Provider: Luma
  * Model: photon-flash-1
  * Support sizes (width x height) or aspect ratios (width : height): 1:1, 3:4, 4:3, 9:16, 16:9, 9:21, 21:9
* Provider: Together.ai
  * Model: stabilityai/stable-diffusion-xl-base-1.0
  * Support sizes (width x height) or aspect ratios (width : height): 512x512, 768x768, 1024x1024
* Provider: Together.ai
  * Model: black-forest-labs/FLUX.1-dev
  * Support sizes (width x height) or aspect ratios (width : height): 512x512, 768x768, 1024x1024
* Provider: Together.ai
  * Model: black-forest-labs/FLUX.1-dev-lora
  * Support sizes (width x height) or aspect ratios (width : height): 512x512, 768x768, 1024x1024
* Provider: Together.ai
  * Model: black-forest-labs/FLUX.1-schnell
  * Support sizes (width x height) or aspect ratios (width : height): 512x512, 768x768, 1024x1024
* Provider: Together.ai
  * Model: black-forest-labs/FLUX.1-canny
  * Support sizes (width x height) or aspect ratios (width : height): 512x512, 768x768, 1024x1024
* Provider: Together.ai
  * Model: black-forest-labs/FLUX.1-depth
  * Support sizes (width x height) or aspect ratios (width : height): 512x512, 768x768, 1024x1024
* Provider: Together.ai
  * Model: black-forest-labs/FLUX.1-redux
  * Support sizes (width x height) or aspect ratios (width : height): 512x512, 768x768, 1024x1024
* Provider: Together.ai
  * Model: black-forest-labs/FLUX.1.1-pro
  * Support sizes (width x height) or aspect ratios (width : height): 512x512, 768x768, 1024x1024
* Provider: Together.ai
  * Model: black-forest-labs/FLUX.1-pro
  * Support sizes (width x height) or aspect ratios (width : height): 512x512, 768x768, 1024x1024
* Provider: Together.ai
  * Model: black-forest-labs/FLUX.1-schnell-Free
  * Support sizes (width x height) or aspect ratios (width : height): 512x512, 768x768, 1024x1024


Above are a small subset of the image models supported by the AI SDK providers. For more, see the respective provider documentation.