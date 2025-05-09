# AI SDK RSC: readStreamableValue

AI SDK RSCreadStreamableValue

AI SDK RSC is currently experimental. We recommend using AI SDK UI for production. For guidance on migrating from RSC to UI, see our migration guide.

It is a function that helps you read the streamable value from the client that was originally created using `createStreamableValue` on the server.

Import

-----------------

```ts
import { readStreamableValue } from "ai/rsc"
```

Example

-----------------

```ts

async function generate() {
  'use server';
  const streamable = createStreamableValue();
  streamable.update(1);
  streamable.update(2);
  streamable.done(3);
  return streamable.value;
}
```

```ts

import { readStreamableValue } from 'ai/rsc';
export default function Page() {
  const [generation, setGeneration] = useState('');
  return (
    <div>
      <button
        onClick={async () => {
          const stream = await generate();
          for await (const delta of readStreamableValue(stream)) {
            setGeneration(generation => generation + delta);
          }
        }}
      >
        Generate
      </button>
    </div>
  );
}
```

API Signature

-----------------

## Parameters

The streamable value to read from.

### Returns

It returns an async iterator that contains the values emitted by the streamable value.
