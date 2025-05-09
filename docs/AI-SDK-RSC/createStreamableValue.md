# AI SDK RSC: createStreamableValue

AI SDK RSCcreateStreamableValue

AI SDK RSC is currently experimental. We recommend using AI SDK UI for production. For guidance on migrating from RSC to UI, see our migration guide.

Create a stream that sends values from the server to the client. The value can be any serializable data.

Import
-----------------

```
import { createStreamableValue } from "ai/rsc"
```

API Signature
-------------------------------

### Parameters

Any data that RSC supports. Example, JSON.

### Returns

This creates a special value that can be returned from Actions to the client. It holds the data inside and can be updated via the update method.

Elevate your AI applications with Vercel.

Trusted by OpenAI, Replicate, Suno, Pinecone, and more.

Vercel provides tools and infrastructure to deploy AI apps and features at scale.
