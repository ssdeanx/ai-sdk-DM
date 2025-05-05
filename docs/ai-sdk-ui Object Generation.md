# AI SDK UI: Object Generation
[AI SDK UI](https://ai-sdk.dev/docs/ai-sdk-ui)Object Generation

`useObject` is an experimental feature and only available in React.

The [`useObject`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object) hook allows you to create interfaces that represent a structured JSON object that is being streamed.

In this guide, you will learn how to use the `useObject` hook in your application to generate UIs for structured data on the fly.

[Example](#example)
-------------------

The example shows a small notifications demo app that generates fake notifications in real-time.

### [Schema](#schema)

It is helpful to set up the schema in a separate file that is imported on both the client and server.

```

import { z } from 'zod';
// define a schema for the notifications
export const notificationSchema = z.object({
  notifications: z.array(
    z.object({
      name: z.string().describe('Name of a fictional person.'),
      message: z.string().describe('Message. Do not use emojis or links.'),
    }),
  ),
});
```


### [Client](#client)

The client uses [`useObject`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object) to stream the object generation process.

The results are partial and are displayed as they are received. Please note the code for handling `undefined` values in the JSX.

```

'use client';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { notificationSchema } from './api/notifications/schema';
export default function Page() {
  const { object, submit } = useObject({
    api: '/api/notifications',
    schema: notificationSchema,
  });
  return (
    <>
      <button onClick={() => submit('Messages during finals week.')}>
        Generate notifications
      </button>
      {object?.notifications?.map((notification, index) => (
        <div key={index}>
          <p>{notification?.name}</p>
          <p>{notification?.message}</p>
        </div>
      ))}
    </>
  );
}
```


### [Server](#server)

On the server, we use [`streamObject`](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-object) to stream the object generation process.

```

import { openai } from '@ai-sdk/openai';
import { streamObject } from 'ai';
import { notificationSchema } from './schema';
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export async function POST(req: Request) {
  const context = await req.json();
  const result = streamObject({
    model: openai('gpt-4-turbo'),
    schema: notificationSchema,
    prompt:
      `Generate 3 notifications for a messages app in this context:` + context,
  });
  return result.toTextStreamResponse();
}
```


[Customized UI](#customized-ui)
-------------------------------

`useObject` also provides ways to show loading and error states:

### [Loading State](#loading-state)

The `isLoading` state returned by the `useObject` hook can be used for several purposes:

*   To show a loading spinner while the object is generated.
*   To disable the submit button.

```

'use client';
import { useObject } from '@ai-sdk/react';
export default function Page() {
  const { isLoading, object, submit } = useObject({
    api: '/api/notifications',
    schema: notificationSchema,
  });
  return (
    <>
      {isLoading && <Spinner />}
      <button
        onClick={() => submit('Messages during finals week.')}
        disabled={isLoading}
      >
        Generate notifications
      </button>
      {object?.notifications?.map((notification, index) => (
        <div key={index}>
          <p>{notification?.name}</p>
          <p>{notification?.message}</p>
        </div>
      ))}
    </>
  );
}
```


### [Stop Handler](#stop-handler)

The `stop` function can be used to stop the object generation process. This can be useful if the user wants to cancel the request or if the server is taking too long to respond.

```

'use client';
import { useObject } from '@ai-sdk/react';
export default function Page() {
  const { isLoading, stop, object, submit } = useObject({
    api: '/api/notifications',
    schema: notificationSchema,
  });
  return (
    <>
      {isLoading && (
        <button type="button" onClick={() => stop()}>
          Stop
        </button>
      )}
      <button onClick={() => submit('Messages during finals week.')}>
        Generate notifications
      </button>
      {object?.notifications?.map((notification, index) => (
        <div key={index}>
          <p>{notification?.name}</p>
          <p>{notification?.message}</p>
        </div>
      ))}
    </>
  );
}
```


### [Error State](#error-state)

Similarly, the `error` state reflects the error object thrown during the fetch request. It can be used to display an error message, or to disable the submit button:

We recommend showing a generic error message to the user, such as "Something went wrong." This is a good practice to avoid leaking information from the server.

```

'use client';
import { useObject } from '@ai-sdk/react';
export default function Page() {
  const { error, object, submit } = useObject({
    api: '/api/notifications',
    schema: notificationSchema,
  });
  return (
    <>
      {error && <div>An error occurred.</div>}
      <button onClick={() => submit('Messages during finals week.')}>
        Generate notifications
      </button>
      {object?.notifications?.map((notification, index) => (
        <div key={index}>
          <p>{notification?.name}</p>
          <p>{notification?.message}</p>
        </div>
      ))}
    </>
  );
}
```


[Event Callbacks](#event-callbacks)
-----------------------------------

`useObject` provides optional event callbacks that you can use to handle life-cycle events.

*   `onFinish`: Called when the object generation is completed.
*   `onError`: Called when an error occurs during the fetch request.

These callbacks can be used to trigger additional actions, such as logging, analytics, or custom UI updates.

```

'use client';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { notificationSchema } from './api/notifications/schema';
export default function Page() {
  const { object, submit } = useObject({
    api: '/api/notifications',
    schema: notificationSchema,
    onFinish({ object, error }) {
      // typed object, undefined if schema validation fails:
      console.log('Object generation completed:', object);
      // error, undefined if schema validation succeeds:
      console.log('Schema validation error:', error);
    },
    onError(error) {
      // error during fetch request:
      console.error('An error occurred:', error);
    },
  });
  return (
    <div>
      <button onClick={() => submit('Messages during finals week.')}>
        Generate notifications
      </button>
      {object?.notifications?.map((notification, index) => (
        <div key={index}>
          <p>{notification?.name}</p>
          <p>{notification?.message}</p>
        </div>
      ))}
    </div>
  );
}
```


[Configure Request Options](#configure-request-options)
-------------------------------------------------------

You can configure the API endpoint, optional headers and credentials using the `api`, `headers` and `credentials` settings.

```

const { submit, object } = useObject({
  api: '/api/use-object',
  headers: {
    'X-Custom-Header': 'CustomValue',
  },
  credentials: 'include',
  schema: yourSchema,
});
```
