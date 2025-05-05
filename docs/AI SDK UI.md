# AI SDK UI: Overview
[AI SDK UI](https://ai-sdk.dev/docs/ai-sdk-ui)Overview

[AI SDK UI](#ai-sdk-ui)
-----------------------

AI SDK UI is designed to help you build interactive chat, completion, and assistant applications with ease. It is a **framework-agnostic toolkit**, streamlining the integration of advanced AI functionalities into your applications.

AI SDK UI provides robust abstractions that simplify the complex tasks of managing chat streams and UI updates on the frontend, enabling you to develop dynamic AI-driven interfaces more efficiently. With four main hooks — **`useChat`**, **`useCompletion`**, **`useObject`**, and **`useAssistant`** — you can incorporate real-time chat capabilities, text completions, streamed JSON, and interactive assistant features into your app.

*   **[`useChat`](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)** offers real-time streaming of chat messages, abstracting state management for inputs, messages, loading, and errors, allowing for seamless integration into any UI design.
*   **[`useCompletion`](https://ai-sdk.dev/docs/ai-sdk-ui/completion)** enables you to handle text completions in your applications, managing the prompt input and automatically updating the UI as new completions are streamed.
*   **[`useObject`](https://ai-sdk.dev/docs/ai-sdk-ui/object-generation)** is a hook that allows you to consume streamed JSON objects, providing a simple way to handle and display structured data in your application.
*   **[`useAssistant`](https://ai-sdk.dev/docs/ai-sdk-ui/openai-assistants)** is designed to facilitate interaction with OpenAI-compatible assistant APIs, managing UI state and updating it automatically as responses are streamed.

These hooks are designed to reduce the complexity and time required to implement AI interactions, letting you focus on creating exceptional user experiences.

[UI Framework Support](#ui-framework-support)
---------------------------------------------

AI SDK UI supports the following frameworks: [React](https://react.dev/), [Svelte](https://svelte.dev/), [Vue.js](https://vuejs.org/), and [SolidJS](https://www.solidjs.com/) (deprecated). Here is a comparison of the supported functions across these frameworks:

[Contributions](https://github.com/vercel/ai/blob/main/CONTRIBUTING.md) are welcome to implement missing features for non-React frameworks.

[API Reference](#api-reference)
-------------------------------

Please check out the [AI SDK UI API Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui) for more details on each function.