# AI SDK RSC: getMutableAIState

AI SDK RSCgetMutableAIState

AI SDK RSC is currently experimental. We recommend using AI SDK UI for production. For guidance on migrating from RSC to UI, see our migration guide.

Get a mutable copy of the AI state. You can use this to update the state in the server.

Import

-----------------

```ts
import { getMutableAIState } from "ai/rsc"
```

API Signature

-----------------

## Parameters

Returns the value of the specified key in the AI state, if it's an object.

### Returns

The mutable AI state.

### Methods

### update

(newState: any) => void

Updates the AI state with the new state.

### done

(newState: any) => void

Updates the AI state with the new state, marks it as finalized and closes the stream.

Examples

-----------------

Elevate your AI applications with Vercel.

Trusted by OpenAI, Replicate, Suno, Pinecone, and more.

Vercel provides tools and infrastructure to deploy AI apps and features at scale.
