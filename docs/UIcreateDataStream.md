# AI SDK UI: createDataStream
AI SDK UIcreateDataStream

The `createDataStream` function allows you to stream additional data to the client (see Streaming Data).

Import
-----------------

```
import { createDataStream } from "ai"
```


Example
-------------------

```

const stream = createDataStream({
  async execute(dataStream) {
    // Write data
    dataStream.writeData({ value: 'Hello' });
    // Write annotation
    dataStream.writeMessageAnnotation({ type: 'status', value: 'processing' });
    // Merge another stream
    const otherStream = getAnotherStream();
    dataStream.merge(otherStream);
  },
  onError: error => `Custom error: ${error.message}`,
});
```


API Signature
-------------------------------

### Parameters

### execute:

(dataStream: DataStreamWriter) => Promise<void> | void

A function that receives a DataStreamWriter instance and can use it to write data to the stream.

DataStreamWriter

### write:

(data: DataStreamString) => void

Appends a data part to the stream.

### writeData:

(value: JSONValue) => void

Appends a data part to the stream.

### writeMessageAnnotation:

(value: JSONValue) => void

Appends a message annotation to the stream.

### writeSource:

(source: Source) => void

Appends a source part to the stream.

### merge:

(stream: ReadableStream<DataStreamString>) => void

Merges the contents of another stream to this stream.

### onError:

((error: unknown) => string) | undefined

Error handler that is used by the data stream writer. This is intended for forwarding when merging streams to prevent duplicated error masking.

### onError:

(error: unknown) => string

A function that handles errors and returns an error message string. By default, it returns "An error occurred."

### Returns

`ReadableStream<DataStreamString>`

A readable stream that emits formatted data stream parts.