# AI SDK RSC: Error Handling
AI SDK RSCError Handling

AI SDK RSC is currently experimental. We recommend using AI SDK UI for production. For guidance on migrating from RSC to UI, see our migration guide.

Two categories of errors can occur when working with the RSC API: errors while streaming user interfaces and errors while streaming other values.

Handling UI Errors
-----------------------------------------

To handle errors while generating UI, the `streamableUI` object exposes an `error()` method.

```

'use server';
import { createStreamableUI } from 'ai/rsc';
export async function getStreamedUI() {
  const ui = createStreamableUI();
  (async () => {
    ui.update(<div>loading</div>);
    const data = await fetchData();
    ui.done(<div>{data}</div>);
  })().catch(e => {
    ui.error(<div>Error: {e.message}</div>);
  });
  return ui.value;
}
```


With this method, you can catch any error with the stream, and return relevant UI. On the client, you can also use a React Error Boundary to wrap the streamed component and catch any additional errors.

```

import { getStreamedUI } from '@/actions';
import { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
export default function Page() {
  const [streamedUI, setStreamedUI] = useState(null);
  return (
    <div>
      <button
        onClick={async () => {
          const newUI = await getStreamedUI();
          setStreamedUI(newUI);
        }}
      >
        What does the new UI look like?
      </button>
      <ErrorBoundary>{streamedUI}</ErrorBoundary>
    </div>
  );
}
```


Handling Other Errors
-----------------------------------------------

To handle other errors while streaming, you can return an error object that the receiver can use to determine why the failure occurred.

```

'use server';
import { createStreamableValue } from 'ai/rsc';
import { fetchData, emptyData } from '../utils/data';
export const getStreamedData = async () => {
  const streamableData = createStreamableValue<string>(emptyData);
  try {
    (() => {
      const data1 = await fetchData();
      streamableData.update(data1);
      const data2 = await fetchData();
      streamableData.update(data2);
      const data3 = await fetchData();
      streamableData.done(data3);
    })();
    return { data: streamableData.value };
  } catch (e) {
    return { error: e.message };
  }
};
```
