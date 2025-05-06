# AI SDK UI: appendClientMessage
AI SDK UIappendClientMessage

Appends a client Message object to an existing array of UI messages. If the last message in the array has the same ID as the new message, it will replace the existing message instead of appending. This is useful for maintaining a unified message history in a client-side chat application, especially when updating existing messages.

Import
-----------------

```
import { appendClientMessage } from "ai"
```


API Signature
-------------------------------

### Parameters

An existing array of UI messages for useChat (usually from state).

The new client message to be appended or used to replace an existing message with the same ID.

### Returns

A new array of UI messages with either the appended message or the updated message replacing the previous one with the same ID.

Elevate your AI applications with Vercel.

Trusted by OpenAI, Replicate, Suno, Pinecone, and more.

Vercel provides tools and infrastructure to deploy AI apps and features at scale.