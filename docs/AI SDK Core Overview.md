# AI SDK Core: Overview
[AI SDK Core](https://ai-sdk.dev/docs/ai-sdk-core)Overview

[AI SDK Core](#ai-sdk-core)
---------------------------

Large Language Models (LLMs) are advanced programs that can understand, create, and engage with human language on a large scale. They are trained on vast amounts of written material to recognize patterns in language and predict what might come next in a given piece of text.

AI SDK Core **simplifies working with LLMs by offering a standardized way of integrating them into your app** - so you can focus on building great AI applications for your users, not waste time on technical details.

For example, here’s how you can generate text with various models using the AI SDK:

import { generateText } from "ai"

import { xai } from "@ai-sdk/xai"

const { text } = await generateText({

model: xai("grok-3-beta"),

prompt: "What is love?"

})

Love is a universal emotion that is characterized by feelings of affection, attachment, and warmth towards someone or something. It is a complex and multifaceted experience that can take many different forms, including romantic love, familial love, platonic love, and self-love.

[AI SDK Core Functions](#ai-sdk-core-functions)
-----------------------------------------------

AI SDK Core has various functions designed for [text generation](./generating-text), [structured data generation](./generating-structured-data), and [tool usage](./tools-and-tool-calling). These functions take a standardized approach to setting up [prompts](./prompts) and [settings](./settings), making it easier to work with different models.

*   [`generateText`](https://ai-sdk.dev/docs/ai-sdk-core/generating-text): Generates text and [tool calls](./tools-and-tool-calling). This function is ideal for non-interactive use cases such as automation tasks where you need to write text (e.g. drafting email or summarizing web pages) and for agents that use tools.
*   [`streamText`](https://ai-sdk.dev/docs/ai-sdk-core/generating-text): Stream text and tool calls. You can use the `streamText` function for interactive use cases such as [chat bots](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) and [content streaming](https://ai-sdk.dev/docs/ai-sdk-ui/completion).
*   [`generateObject`](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data): Generates a typed, structured object that matches a [Zod](https://zod.dev/) schema. You can use this function to force the language model to return structured data, e.g. for information extraction, synthetic data generation, or classification tasks.
*   [`streamObject`](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data): Stream a structured object that matches a Zod schema. You can use this function to [stream generated UIs](https://ai-sdk.dev/docs/ai-sdk-ui/object-generation).

[API Reference](#api-reference)
-------------------------------

Please check out the [AI SDK Core API Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core) for more details on each function.