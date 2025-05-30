# AI SDK RSC: createAI

AI SDK RSCcreateAI

AI SDK RSC is currently experimental. We recommend using AI SDK UI for production. For guidance on migrating from RSC to UI, see our migration guide.

Creates a client-server context provider that can be used to wrap parts of your application tree to easily manage both UI and AI states of your application.

Import

-----------------

```ts
import { createAI } from "ai/rsc"
```

API Signature

-----------------

## Parameters

### actions

Record<string, Action>

Server side actions that can be called from the client.

Initial AI state to be used in the client.

Initial UI state to be used in the client.

### onGetUIState

() => UIState

is called during SSR to compare and update UI state.

### onSetAIState

(Event) => void

is triggered whenever an update() or done() is called by the mutable AI state in your action, so you can safely store your AI state in the database.

Event

The resulting AI state after the update.

Whether the AI state updates have been finalized or not.

### Returns

It returns an `<AI/>` context provider.

Examples

-----------------

Elevate your AI applications with Vercel.

Trusted by OpenAI, Replicate, Suno, Pinecone, and more.

Vercel provides tools and infrastructure to deploy AI apps and features at scale.
