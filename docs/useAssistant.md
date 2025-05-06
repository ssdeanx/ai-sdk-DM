# AI SDK UI: useAssistant
The API endpoint that accepts a threadId and message object and returns an AssistantResponse stream. It can be a relative path (starting with \`/\`) or an absolute URL.

### threadId?:

string | undefined

Represents the ID of an existing thread. If not provided, a new thread will be created.

### credentials?:

'omit' | 'same-origin' | 'include' = 'same-origin'

Sets the mode of credentials to be used on the request.

Additional body to be passed to the API endpoint.

### onError?:

(error: Error) => void

Callback that will be called when the assistant encounters an error

Optional. A custom fetch function to be used for the API call. Defaults to the global fetch function.