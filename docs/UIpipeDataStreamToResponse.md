# AI SDK UI: pipeDataStreamToResponse
The Node.js ServerResponse object to pipe the data to.

The status code for the response.

The status text for the response.

### execute:

(dataStream: DataStreamWriter) => Promise<void> | void

A function that receives a DataStreamWriter instance and can use it to write data to the stream.

DataStreamWriter

### writeData:

(value: JSONValue) => void

Appends a data part to the stream.

### writeMessageAnnotation:

(value: JSONValue) => void

Appends a message annotation to the stream.

### merge:

(stream: ReadableStream<DataStreamString>) => void

Merges the contents of another stream to this stream.

### onError:

((error: unknown) => string) | undefined

Error handler that is used by the data stream writer. This is intended for forwarding when merging streams to prevent duplicated error masking.

### onError:

(error: unknown) => string

A function that handles errors and returns an error message string. By default, it returns "An error occurred."