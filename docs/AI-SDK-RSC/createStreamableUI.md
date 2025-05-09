# AI SDK RSC: createStreamableUI

AI SDK RSCcreateStreamableUI

AI SDK RSC is currently experimental. We recommend using AI SDK UI for production. For guidance on migrating from RSC to UI, see our migration guide.

Create a stream that sends UI from the server to the client. On the client side, it can be rendered as a normal React node.

Import
-----------------

```
import { createStreamableUI } from "ai/rsc"
```

API Signature
-------------------------------

### Parameters

The initial value of the streamable UI.

### Returns

The value of the streamable UI. This can be returned from a Server Action and received by the client.

### Methods

### update

(ReactNode) => void

Updates the current UI node. It takes a new UI node and replaces the old one.

### append

(ReactNode) => void

Appends a new UI node to the end of the old one. Once appended a new UI node, the previous UI node cannot be updated anymore.

### done

(ReactNode | null) => void

Marks the UI node as finalized and closes the stream. Once called, the UI node cannot be updated or appended anymore. This method is always required to be called, otherwise the response will be stuck in a loading state.

Signals that there is an error in the UI stream. It will be thrown on the client side and caught by the nearest error boundary component.

Examples
---------------------

Elevate your AI applications with Vercel.

Trusted by OpenAI, Replicate, Suno, Pinecone, and more.

Vercel provides tools and infrastructure to deploy AI apps and features at scale.
