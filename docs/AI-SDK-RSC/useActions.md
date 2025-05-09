# AI SDK RSC: useActions

AI SDK RSCuseActions

AI SDK RSC is currently experimental. We recommend using AI SDK UI for production. For guidance on migrating from RSC to UI, see our migration guide.

It is a hook to help you access your Server Actions from the client. This is particularly useful for building interfaces that require user interactions with the server.

It is required to access these server actions via this hook because they are patched when passed through the context. Accessing them directly may result in a Cannot find Client Component error.

Import
-----------------

```ts
import { useActions } from "ai/rsc"
```

API Signature
-------------------------------

### Returns

`Record<string, Action>`, a dictionary of server actions.

Examples
---------------------

Elevate your AI applications with Vercel.

Trusted by OpenAI, Replicate, Suno, Pinecone, and more.

Vercel provides tools and infrastructure to deploy AI apps and features at scale.
