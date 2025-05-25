# Gemini models  |  Gemini API  |  Google AI for Developers

2.5 Pro

Our most powerful thinking model with maximum response accuracy and state-of-the-art performance

* Input audio, images, video, and text, get text responses
* Tackle difficult problems, analyze large databases, and more
* Best for complex coding, reasoning, and multimodal understanding

2.5 Flash

Our best model in terms of price-performance, offering well-rounded capabilities.

* Input audio, images, video, and text, and get text responses
* Model thinks as needed; or, you can configure a thinking budget
* Best for low latency, high volume tasks that require thinking

2.0 Flash

Our newest multimodal model, with next generation features and improved capabilities

* Input audio, images, video, and text, get text responses
* Generate code and images, extract data, analyze files, generate graphs, and more
* Low latency, enhanced performance, built to power agentic experiences

## Model variants

--------------

The Gemini API offers different models that are optimized for specific use cases. Here's a brief overview of Gemini variants that are available:

* Model variant: Gemini 2.5 Flash Preview 05-20    gemini-2.5-flash-preview-05-20
  * Input(s): Audio, images, videos, and text
  * Output: Text
  * Optimized for: Adaptive thinking, cost efficiency
* Model variant: Gemini 2.5 Flash Native Audio    gemini-2.5-flash-preview-native-audio-dialog &    gemini-2.5-flash-exp-native-audio-thinking-dialog
  * Input(s): Audio, videos, and text
  * Output: Text and audio, interleaved
  * Optimized for: High quality, natural conversational audio outputs, with or without thinking
* Model variant: Gemini 2.5 Flash Preview TTS    gemini-2.5-flash-preview-tts
  * Input(s): Text
  * Output: Audio
  * Optimized for: Low latency, controllable, single- and multi-speaker text-to-speech audio generation
* Model variant: Gemini 2.5 Pro Preview    gemini-2.5-pro-preview-05-06
  * Input(s): Audio, images, videos, and text
  * Output: Text
  * Optimized for: Enhanced thinking and reasoning, multimodal understanding, advanced coding, and more
* Model variant: Gemini 2.5 Pro Preview TTS    gemini-2.5-pro-preview-tts
  * Input(s): Text
  * Output: Audio
  * Optimized for: Low latency, controllable, single- and multi-speaker text-to-speech audio generation
* Model variant: Gemini 2.0 Flash    gemini-2.0-flash
  * Input(s): Audio, images, videos, and text
  * Output: Text
  * Optimized for: Next generation features, speed, thinking, and realtime streaming.
* Model variant: Gemini 2.0 Flash Preview Image Generation    gemini-2.0-flash-preview-image-generation
  * Input(s): Audio, images, videos, and text
  * Output: Text, images
  * Optimized for: Conversational image generation and editing
* Model variant: Gemini 2.0 Flash-Lite    gemini-2.0-flash-lite
  * Input(s): Audio, images, videos, and text
  * Output: Text
  * Optimized for: Cost efficiency and low latency
* Model variant: Gemini 1.5 Flash    gemini-1.5-flash
  * Input(s): Audio, images, videos, and text
  * Output: Text
  * Optimized for: Fast and versatile performance across a diverse variety of tasks
* Model variant: Gemini 1.5 Flash-8B    gemini-1.5-flash-8b
  * Input(s): Audio, images, videos, and text
  * Output: Text
  * Optimized for: High volume and lower intelligence tasks
* Model variant: Gemini 1.5 Pro    gemini-1.5-pro
  * Input(s): Audio, images, videos, and text
  * Output: Text
  * Optimized for:       Complex reasoning tasks requiring more intelligence
* Model variant: Gemini Embedding    gemini-embedding-exp
  * Input(s): Text
  * Output: Text embeddings
  * Optimized for:       Measuring the relatedness of text strings
* Model variant: Imagen 3    imagen-3.0-generate-002
  * Input(s): Text
  * Output: Images
  * Optimized for: Our most advanced image generation model
* Model variant: Veo 2    veo-2.0-generate-001
  * Input(s): Text, images
  * Output: Video
  * Optimized for: High quality video generation
* Model variant: Gemini 2.0 Flash Live    gemini-2.0-flash-live-001
  * Input(s): Audio, video, and text
  * Output: Text, audio
  * Optimized for: Low-latency bidirectional voice and video interactions

You can view the rate limits for each model on the rate limits page.

### Gemini 2.5 Flash Preview 05-20

Our best model in terms of price-performance, offering well-rounded capabilities. Gemini 2.5 Flash rate limits are more restricted since it is an experimental / preview model.

Try in Google AI Studio

#### Model details

* Property: Model code
  * Description: models/gemini-2.5-flash-preview-05-20
* Property: Supported data types
  * Description:                   Inputs          Text, images, video, audio                          Output          Text
* Property: Token limits[*]
  * Description:                   Input token limit          1,048,576                          Output token limit          65,536
* Property: Capabilities
  * Description:                   Audio generation          Not supported                          Caching          Supported                          Code execution          Supported                          Function calling          Supported                           Image generation          Not supported                          Search grounding          Supported                          Structured outputs          Supported                          Thinking          Supported                          Tuning          Not supported
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      Preview: gemini-2.5-flash-preview-05-20
* Property: Latest update
  * Description: May 2025
* Property: Knowledge cutoff
  * Description: January 2025

### Gemini 2.5 Flash Native Audio

Our native audio dialog models, with and without thinking, available through the Live API. These models provide interactive and unstructured conversational experiences, with style and control prompting.

Try native audio in Google AI Studio

#### Model details

* Property: Model code
  * Description: models/gemini-2.5-flash-preview-native-audio-dialog &      models/gemini-2.5-flash-exp-native-audio-thinking-dialog
* Property: Supported data types
  * Description:                   Inputs          Audio, video, text                          Output          Audio and text
* Property: Token limits[*]
  * Description:                   Input token limit          128,000                          Output token limit          8,000
* Property: Capabilities
  * Description:                   Audio generation          Supported                          Caching          Not supported                          Code execution          Not supported                          Function calling          Supported                           Image generation          Not supported                          Search grounding          Supported                          Structured outputs          Not supported                          Thinking          Supported                          Tuning          Not supported
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      Preview: gemini-2.5-flash-preview-05-20            Experimental: gemini-2.5-flash-exp-native-audio-thinking-dialog
* Property: Latest update
  * Description: May 2025
* Property: Knowledge cutoff
  * Description: January 2025

### Gemini 2.5 Flash Preview Text-to-Speech

Gemini 2.5 Flash Preview TTS is our price-performant text-to-speech model, delivering high control and transparency for structured workflows like podcast generation, audiobooks, customer support, and more. Gemini 2.5 Flash rate limits are more restricted since it is an experimental / preview model.

Try in Google AI Studio

#### Model details

* Property: Model code
  * Description: models/gemini-2.5-flash-preview-tts
* Property: Supported data types
  * Description:                   Inputs          Text                          Output          Audio
* Property: Token limits[*]
  * Description:                   Input token limit          8,000                          Output token limit          16,000
* Property: Capabilities
  * Description:                   Structured outputs          Not supported                          Caching          Not supported                          Tuning          Not supported                          Function calling          Not supported                          Code execution          Not supported                          Search          Not supported                          Audio generation          Supported                          Live API          Not supported                          Thinking          Not supported
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      gemini-2.5-flash-preview-tts
* Property: Latest update
  * Description: May 2025

### Gemini 2.5 Pro Preview

Gemini 2.5 Pro is our state-of-the-art thinking model, capable of reasoning over complex problems in code, math, and STEM, as well as analyzing large datasets, codebases, and documents using long context. Gemini 2.5 Pro rate limits are more restricted since it is a preview model.

Try in Google AI Studio

#### Model details

* Property: Model code
  * Description: gemini-2.5-pro-preview-05-06
* Property: Supported data types
  * Description:                   Inputs          Audio, images, video, and text                          Output          Text
* Property: Token limits[*]
  * Description:                   Input token limit          1,048,576                          Output token limit          65,536
* Property: Capabilities
  * Description:                   Structured outputs          Supported                          Caching          Supported                          Tuning          Not supported                          Function calling          Supported                          Code execution          Supported                          Search grounding          Supported                          Image generation          Not supported                          Audio generation          Not supported                          Live API          Not supported                          Thinking          Supported
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      gemini-2.5-pro-preview-05-06
* Property: Latest update
  * Description: May 2025
* Property: Knowledge cutoff
  * Description: January 2025

### Gemini 2.5 Pro Preview Text-to-Speech

Gemini 2.5 Pro Preview TTS is our most powerful text-to-speech model, delivering high control and transparency for structured workflows like podcast generation, audiobooks, customer support, and more. Gemini 2.5 Pro rate limits are more restricted since it is an experimental / preview model.

Try in Google AI Studio

#### Model details

* Property: Model code
  * Description: models/gemini-2.5-pro-preview-tts
* Property: Supported data types
  * Description:                   Inputs          Text                          Output          Audio
* Property: Token limits[*]
  * Description:                   Input token limit          8,000                          Output token limit          16,000
* Property: Capabilities
  * Description:                   Structured outputs          Not supported                          Caching          Not supported                          Tuning          Not supported                          Function calling          Not supported                          Code execution          Not supported                          Search          Not supported                          Audio generation          Supported                          Live API          Not supported                          Thinking          Not supported
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      gemini-2.5-pro-preview-tts
* Property: Latest update
  * Description: May 2025

### Gemini 2.0 Flash

Gemini 2.0 Flash delivers next-gen features and improved capabilities, including superior speed, native tool use, and a 1M token context window.

Try in Google AI Studio

#### Model details

* Property: Model code
  * Description: models/gemini-2.0-flash
* Property: Supported data types
  * Description:                   Inputs          Audio, images, video, and text                          Output          Text
* Property: Token limits[*]
  * Description:                   Input token limit          1,048,576                          Output token limit          8,192
* Property: Capabilities
  * Description:                   Structured outputs          Supported                          Caching          Supported                          Tuning          Not supported                          Function calling          Supported                          Code execution          Supported                          Search          Supported                          Image generation          Not supported                          Audio generation          Not supported                          Live API          Supported                          Thinking          Experimental
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      Latest: gemini-2.0-flash            Stable: gemini-2.0-flash-001            Experimental: gemini-2.0-flash-exp
* Property: Latest update
  * Description: February 2025
* Property: Knowledge cutoff
  * Description: August 2024

### Gemini 2.0 Flash Preview Image Generation

Gemini 2.0 Flash Preview Image Generation delivers improved image generation features, including generating and editing images conversationally.

Try in Google AI Studio

#### Model details

* Property: Model code
  * Description: models/gemini-2.0-flash-preview-image-generation
* Property: Supported data types
  * Description:                   Inputs          Audio, images, video, and text                          Output          Text and images
* Property: Token limits[*]
  * Description:                   Input token limit          32,000                          Output token limit          8,192
* Property: Capabilities
  * Description:                   Structured outputs          Supported                          Caching          Supported                          Tuning          Not supported                          Function calling          Not supported                          Code execution          Not Supported                          Search          Not Supported                          Image generation          Supported                          Audio generation          Not supported                          Live API          Not Supported                          Thinking          Not Supported
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      Preview: gemini-2.0-flash-preview-image-generation            gemini-2.0-flash-preview-image-generation is not currently supported in a number of countries in Europe, Middle East & Africa
* Property: Latest update
  * Description: May 2025
* Property: Knowledge cutoff
  * Description: August 2024

### Gemini 2.0 Flash-Lite

A Gemini 2.0 Flash model optimized for cost efficiency and low latency.

Try in Google AI Studio

#### Model details

* Property: Model code
  * Description: models/gemini-2.0-flash-lite
* Property: Supported data types
  * Description:                   Inputs          Audio, images, video, and text                          Output          Text
* Property: Token limits[*]
  * Description:                   Input token limit          1,048,576                          Output token limit          8,192
* Property: Capabilities
  * Description:                   Structured outputs          Supported                          Caching          Supported                          Tuning          Not supported                          Function calling          Supported                          Code execution          Not supported                          Search          Not supported                          Image generation          Not supported                          Audio generation          Not supported                          Live API          Not supported
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      Latest: gemini-2.0-flash-lite            Stable: gemini-2.0-flash-lite-001
* Property: Latest update
  * Description: February 2025
* Property: Knowledge cutoff
  * Description: August 2024

### Gemini 1.5 Flash NOT USING

Gemini 1.5 Flash is a fast and versatile multimodal model for scaling across diverse tasks.

Try in Google AI Studio

#### Model details

* Property: Model code
  * Description: models/gemini-1.5-flash
* Property: Supported data types
  * Description:                   Inputs          Audio, images, video, and text                          Output          Text
* Property: Token limits[*]
  * Description:                   Input token limit          1,048,576                          Output token limit          8,192
* Property: Audio/visual specs
  * Description:                   Maximum number of images per prompt          3,600                          Maximum video length          1 hour                          Maximum audio length          Approximately 9.5 hours
* Property: Capabilities
  * Description:                   System instructions          Supported                          JSON mode          Supported                          JSON schema          Supported                          Adjustable safety settings          Supported                          Caching          Supported                          Tuning          Supported                          Function calling          Supported                          Code execution          Supported                          Live API          Not supported
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      Latest: gemini-1.5-flash-latest            Latest stable: gemini-1.5-flash            Stable:                          gemini-1.5-flash-001              gemini-1.5-flash-002
* Property: Latest update
  * Description: September 2024

### Gemini 1.5 Flash-8B NOT USING

Gemini 1.5 Flash-8B is a small model designed for lower intelligence tasks.

Try in Google AI Studio

#### Model details

* Property: Model code
  * Description: models/gemini-1.5-flash-8b
* Property: Supported data types
  * Description:                   Inputs          Audio, images, video, and text                          Output          Text
* Property: Token limits[*]
  * Description:                   Input token limit          1,048,576                          Output token limit          8,192
* Property: Audio/visual specs
  * Description:                   Maximum number of images per prompt          3,600                          Maximum video length          1 hour                          Maximum audio length          Approximately 9.5 hours
* Property: Capabilities
  * Description:                   System instructions          Supported                          JSON mode          Supported                          JSON schema          Supported                          Adjustable safety settings          Supported                          Caching          Supported                          Tuning          Supported                          Function calling          Supported                          Code execution          Supported                          Live API          Not supported
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      Latest: gemini-1.5-flash-8b-latest            Latest stable: gemini-1.5-flash-8b            Stable:                          gemini-1.5-flash-8b-001
* Property: Latest update
  * Description: October 2024

### Gemini 1.5 Pr NOT USING 

Try Gemini 2.5 Pro Preview, our most advanced Gemini model to date.

Gemini 1.5 Pro is a mid-size multimodal model that is optimized for a wide-range of reasoning tasks. 1.5 Pro can process large amounts of data at once, including 2 hours of video, 19 hours of audio, codebases with 60,000 lines of code, or 2,000 pages of text.

Try in Google AI Studio

#### Model details

* Property: Model code
  * Description: models/gemini-1.5-pro
* Property: Supported data types
  * Description:                   Inputs          Audio, images, video, and text                          Output          Text
* Property: Token limits[*]
  * Description:                   Input token limit          2,097,152                          Output token limit          8,192
* Property: Audio/visual specs
  * Description:                   Maximum number of images per prompt          7,200                          Maximum video length          2 hours                          Maximum audio length          Approximately 19 hours
* Property: Capabilities
  * Description:                   System instructions          Supported                          JSON mode          Supported                          JSON schema          Supported                          Adjustable safety settings          Supported                          Caching          Supported                          Tuning          Not supported                          Function calling          Supported                          Code execution          Supported                          Live API          Not supported
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      Latest: gemini-1.5-pro-latest            Latest stable: gemini-1.5-pro            Stable:                          gemini-1.5-pro-001              gemini-1.5-pro-002
* Property: Latest update
  * Description: September 2024

### Imagen 3

Imagen 3 is our highest quality text-to-image model, capable of generating images with even better detail, richer lighting and fewer distracting artifacts than our previous models.

##### Model details

* Property: Model code
  * Description:                   Gemini API          imagen-3.0-generate-002
* Property: Supported data types
  * Description:                   Input          Text                          Output          Images
* Property: Token limits[*]
  * Description:                   Input token limit          N/A                          Output images          Up to to 4
* Property: Latest update
  * Description: February 2025

### Veo 2

Veo 2 is our high quality text- and image-to-video model, capable of generating detailed videos, capturing the artistic nuance in your prompts.

##### Model details

* Property: Model code
  * Description:                   Gemini API          veo-2.0-generate-001
* Property: Supported data types
  * Description:                   Input          Text, image                          Output          Video
* Property: Limits
  * Description:                   Text input          N/A                          Image input          Any image resolution and aspect ratio up to 20MB file size                          Output video          Up to 2
* Property: Latest update
  * Description: April 2025

### Gemini 2.0 Flash Live

The Gemini 2.0 Flash Live model works with the Live API to enable low-latency bidirectional voice and video interactions with Gemini. The model can process text, audio, and video input, and it can provide text and audio output.

Try in Google AI Studio

#### Model details

* Property: Model code
  * Description: models/gemini-2.0-flash-live-001
* Property: Supported data types
  * Description:                   Inputs          Audio, video, and text                          Output          Text, and audio
* Property: Token limits[*]
  * Description:                   Input token limit          1,048,576                          Output token limit          8,192
* Property: Capabilities
  * Description:                   Structured outputs          Supported                          Tuning          Not supported                          Function calling          Supported                          Code execution          Supported                          Search          Supported                          Image generation          Not supported                          Audio generation          Supported                          Thinking          Not supported
* Property: Versions
  * Description:                   Read the model version patterns for more details.                      Preview: gemini-2.0-flash-live-001
* Property: Latest update
  * Description: April 2025
* Property: Knowledge cutoff
  * Description: August 2024

### Gemini Embedding Experimental

`Gemini embedding` achieves a SOTA performance across many key dimensions including code, multi-lingual, and retrieval. Gemini Embedding rate limits are more restricted since it is an experimental model.

##### Model details

* Property: Model code
  * Description:                   Gemini API          gemini-embedding-exp-03-07
* Property: Supported data types
  * Description:                   Input          Text                          Output          Text embeddings
* Property: Token limits[*]
  * Description:                   Input token limit          8,192                          Output dimension size          Elastic, supports: 3072, 1536, or 768
* Property: Latest update
  * Description: March 2025

### Text Embedding and Embedding

#### Text Embedding

Try our new experimental Gemini embedding model which achieves state-of-the-art performance.

Text embeddings are used to measure the relatedness of strings and are widely used in many AI applications.

`text-embedding-004` achieves a stronger retrieval performance and outperforms existing models with comparable dimensions, on the standard MTEB embedding benchmarks.

##### Model details

* Property: Model code
  * Description:                   Gemini API          models/text-embedding-004
* Property: Supported data types
  * Description:                   Input          Text                          Output          Text embeddings
* Property: Token limits[*]
  * Description:                   Input token limit          2,048                          Output dimension size          768
* Property: Rate limits[**]
  * Description: 1,500 requests per minute
* Property: Adjustable safety settings
  * Description: Not supported
* Property: Latest update
  * Description: April 2024

#### Embedding

You can use the Embedding model to generate text embeddings for input text.

The Embedding model is optimized for creating embeddings with 768 dimensions for text of up to 2,048 tokens.

##### Embedding model details

* Property: Model code
  * Description:         models/embedding-001
* Property: Supported data types
  * Description:                   Input          Text                          Output          Text embeddings
* Property: Token limits[*]
  * Description:                   Input token limit          2,048                          Output dimension size          768
* Property: Rate limits[**]
  * Description: 1,500 requests per minute
* Property: Adjustable safety settings
  * Description: Not supported
* Property: Latest update
  * Description: December 2023

### AQA

You can use the AQA model to perform Attributed Question-Answering (AQA)–related tasks over a document, corpus, or a set of passages. The AQA model returns answers to questions that are grounded in provided sources, along with estimating answerable probability.

#### Model details

* Property: Model code
  * Description: models/aqa
* Property: Supported data types
  * Description:                   Input          Text                          Output          Text
* Property: Supported language
  * Description: English
* Property: Token limits[*]
  * Description:                   Input token limit          7,168                          Output token limit          1,024
* Property: Rate limits[**]
  * Description: 1,500 requests per minute
* Property: Adjustable safety settings
  * Description: Supported
* Property: Latest update
  * Description: December 2023

See the examples to explore the capabilities of these model variations.

\[\*\] A token is equivalent to about 4 characters for Gemini models. 100 tokens are about 60-80 English words.

### Model version name patterns

Gemini models are available in either _stable_, _preview_, or _experimental_ versions. In your code, you can use one of the following model name formats to specify which model and version you want to use.

### Latest stable

Points to the most recent stable version released for the specified model generation and variation.

To specify the latest stable version, use the following pattern: `<model>-<generation>-<variation>`. For example, `gemini-2.0-flash`.

### Stable

Points to a specific stable model. Stable models usually don't change. Most production apps should use a specific stable model.

To specify a stable version, use the following pattern: `<model>-<generation>-<variation>-<version>`. For example, `gemini-2.0-flash-001`.

### Preview

Points to a preview model which may not be suitable for production use, come with more restrictive rate limits, but may have billing enabled.

To specify a preview version, use the following pattern: `<model>-<generation>-<variation>-<version>`. For example, `gemini-2.5-pro-preview-05-06`.

### Experimental

Points to an experimental model which may not be suitable for production use and come with more restrictive rate limits. We release experimental models to gather feedback and get our latest updates into the hands of developers quickly.

To specify an experimental version, use the following pattern: `<model>-<generation>-<variation>-<version>`. For example, `gemini-2.0-pro-exp-02-05`.

### Experimental models


In addition to stable models, the Gemini API offers experimental models which may not be suitable for production use and come with more restrictive rate limits.

We release experimental models to gather feedback, get our latest updates into the hands of developers quickly, and highlight the pace of innovation happening at Google. What we learn from experimental launches informs how we release models more widely. An experimental model can be swapped for another without prior notice. We don't guarantee that an experimental model will become a stable model in the future.

### Previous experimental models

As new versions or stable releases become available, we remove and replace experimental models. You can find the previous experimental models we released in the following section along with the replacement version:

* Model code: gemini-2.5-flash-preview-04-17
  * Base model: Gemini 2.5 Flash
  * Replacement version: gemini-2.5-flash-preview-05-20
* Model code: gemini-2.0-flash-exp-image-generation
  * Base model: Gemini 2.0 Flash
  * Replacement version: gemini-2.0-flash-preview-image-generation
* Model code: gemini-2.5-pro-preview-03-25
  * Base model: Gemini 2.5 Pro Preview
  * Replacement version: gemini-2.5-pro-preview-05-06
* Model code: gemini-2.0-flash-thinking-exp-01-21
  * Base model: Gemini 2.5 Flash
  * Replacement version: gemini-2.5-flash-preview-04-17
* Model code: gemini-2.0-pro-exp-02-05
  * Base model: Gemini 2.0 Pro Experimental
  * Replacement version: gemini-2.5-pro-preview-03-25
* Model code: gemini-2.0-flash-exp
  * Base model: Gemini 2.0 Flash
  * Replacement version: gemini-2.0-flash
* Model code: gemini-exp-1206
  * Base model: Gemini 2.0 Pro
  * Replacement version: gemini-2.0-pro-exp-02-05
* Model code: gemini-2.0-flash-thinking-exp-1219
  * Base model: Gemini 2.0 Flash Thinking
  * Replacement version: gemini-2.0-flash-thinking-exp-01-21
* Model code: gemini-exp-1121
  * Base model: Gemini
  * Replacement version: gemini-exp-1206


### Gemini Developer API Pricing  |  Gemini API  |  Google AI for Developers

The Gemini API "free tier" is offered through the API service with lower rate limits for testing purposes. Google AI Studio usage is completely free in all available countries. The Gemini API "paid tier" comes with higher rate limits, additional features, and different data handling.

Our first hybrid reasoning model which supports a 1M token context window and has thinking budgets.

Preview models may change before becoming stable and have more restrictive rate limits.

* Input price
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $0.15 (text / image / video)$1.00 (audio)
* Output price
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: Non-thinking: $0.60Thinking: $3.50
* Context caching price
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: $0.0375 (text / image / video)$0.25 (audio)$1.00 / 1,000,000 tokens per hour
* Grounding with Google Search
  * Free Tier: Free of charge, up to 500 RPD
  * Paid Tier, per 1M tokens in USD: 1,500 RPD (free), then $35 / 1,000 requests
* Text-to-speech(gemini-2.5-flash-preview-tts)
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $0.50 (Input)$10.00 (Output)
* Used to improve our products
  * Free Tier: Yes
  * Paid Tier, per 1M tokens in USD: No

Our state-of-the-art multipurpose model, which excels at coding and complex reasoning tasks.

Preview models may change before becoming stable and have more restrictive rate limits.

* Input price
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: $1.25, prompts <= 200k tokens$2.50, prompts > 200k tokens
* Output price (including thinking tokens)
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: $10.00, prompts <= 200k tokens$15.00, prompts > 200k
* Context caching price
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: $0.31, prompts <= 200k tokens$0.625, prompts > 200k$4.50 / 1,000,000 tokens per hour
* Grounding with Google Search
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: 1,500 RPD (free), then $35 / 1,000 requests
* Text-to-speech(gemini-2.5-pro-preview-tts)
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $1.00 (Input)$20.00 (Output)
* Used to improve our products
  * Free Tier: Yes
  * Paid Tier, per 1M tokens in USD: No

Our native audio models optimized for higher quality audio outputs with better pacing, voice naturalness, verbosity, and mood.

Preview models may change before becoming stable and have more restrictive rate limits.

|                                        |Free Tier    |Paid Tier, per 1M tokens in USD  |
|----------------------------------------|-------------|---------------------------------|
|Input price                             |Not available|$0.50 (text)$3.00 (audio / video)|
|Output price (including thinking tokens)|Not available|$2.00 (text)$12.00 (audio)       |
|Used to improve our products            |Yes          |No                               |

Our most balanced multimodal model with great performance across all tasks, with a 1 million token context window, and built for the era of Agents.

* Input price
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $0.10 (text / image / video)$0.70 (audio)
* Output price
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $0.40
* Context caching price
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $0.025 / 1,000,000 tokens (text/image/video)$0.175 / 1,000,000 tokens (audio)
* Context caching (storage)
  * Free Tier: Free of charge, up to 1,000,000 tokens of storage per hour
  * Paid Tier, per 1M tokens in USD: $1.00 / 1,000,000 tokens per hour
* Image generation pricing
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $0.039 per image*
* Tuning price
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: Not available
* Grounding with Google Search
  * Free Tier: Free of charge, up to 500 RPD
  * Paid Tier, per 1M tokens in USD: 1,500 RPD (free), then $35 / 1,000 requests
* Live API
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: Input: $0.35 (text), $2.10 (audio / image [video])Output: $1.50 (text), $8.50 (audio)
* Used to improve our products
  * Free Tier: Yes
  * Paid Tier, per 1M tokens in USD: No

\[\*\] Image output is priced at $30 per 1,000,000 tokens. Output images up to 1024x1024px consume 1290 tokens and are equivalent to $0.039 per image.

Our smallest and most cost effective model, built for at scale usage.

|                            |Free Tier     |Paid Tier, per 1M tokens in USD|
|----------------------------|--------------|-------------------------------|
|Input price                 |Free of charge|$0.075                         |
|Output price                |Free of charge|$0.30                          |
|Context caching price       |Not available |Not available                  |
|Context caching (storage)   |Not available |Not available                  |
|Tuning price                |Not available |Not available                  |
|Grounding with Google Search|Not available |Not available                  |
|Used to improve our products|Yes           |No                             |

Our state-of-the-art image generation model, available to developers on the paid tier of the Gemini API.

|                            |Free Tier    |Paid Tier, per Image in USD|
|----------------------------|-------------|---------------------------|
|Image price                 |Not available|$0.03                      |
|Used to improve our products|Yes          |No                         |

Our state-of-the-art video generation model, available to developers on the paid tier of the Gemini API.

|                            |Free Tier    |Paid Tier, per second in USD|
|----------------------------|-------------|----------------------------|
|Video price                 |Not available|$0.35                       |
|Used to improve our products|Yes          |No                          |

Our lightweight, state-of the art, open model built from the same technology that powers our Gemini models.

|                            |Free Tier     |Paid Tier, per 1M tokens in USD|
|----------------------------|--------------|-------------------------------|
|Input price                 |Free of charge|Not available                  |
|Output price                |Free of charge|Not available                  |
|Context caching price       |Free of charge|Not available                  |
|Context caching (storage)   |Free of charge|Not available                  |
|Tuning price                |Not available |Not available                  |
|Grounding with Google Search|Not available |Not available                  |
|Used to improve our products|Yes           |No                             |

Our open model built for efficient performance on everyday devices like mobile phones, laptops, and tablets.

|                            |Free Tier     |Paid Tier, per 1M tokens in USD|
|----------------------------|--------------|-------------------------------|
|Input price                 |Free of charge|Not available                  |
|Output price                |Free of charge|Not available                  |
|Context caching price       |Free of charge|Not available                  |
|Context caching (storage)   |Free of charge|Not available                  |
|Tuning price                |Not available |Not available                  |
|Grounding with Google Search|Not available |Not available                  |
|Used to improve our products|Yes           |No                             |

Our fastest multimodal model with great performance for diverse, repetitive tasks and a 1 million token context window.

* Input price
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $0.075, prompts <= 128k tokens$0.15, prompts > 128k tokens
* Output price
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $0.30, prompts <= 128k tokens$0.60, prompts > 128k tokens
* Context caching price
  * Free Tier: Free of charge, up to 1 million tokens of storage per hour
  * Paid Tier, per 1M tokens in USD: $0.01875, prompts <= 128k tokens$0.0375, prompts > 128k tokens
* Context caching (storage)
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $1.00 per hour
* Tuning price
  * Free Tier: Token prices are the same for tuned modelsTuning service is free of charge.
  * Paid Tier, per 1M tokens in USD: Token prices are the same for tuned modelsTuning service is free of charge.
* Grounding with Google Search
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: $35 / 1K grounding requests
* Used to improve our products
  * Free Tier: Yes
  * Paid Tier, per 1M tokens in USD: No

Our smallest model for lower intelligence use cases, with a 1 million token context window.

* Input price
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $0.0375, prompts <= 128k tokens$0.075, prompts > 128k tokens
* Output price
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $0.15, prompts <= 128k tokens$0.30, prompts > 128k tokens
* Context caching price
  * Free Tier: Free of charge, up to 1 million tokens of storage per hour
  * Paid Tier, per 1M tokens in USD: $0.01, prompts <= 128k tokens$0.02, prompts > 128k tokens
* Context caching (storage)
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $0.25 per hour
* Tuning price
  * Free Tier: Token prices are the same for tuned modelsTuning service is free of charge.
  * Paid Tier, per 1M tokens in USD: Token prices are the same for tuned modelsTuning service is free of charge.
* Grounding with Google Search
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: $35 / 1K grounding requests
* Used to improve our products
  * Free Tier: Yes
  * Paid Tier, per 1M tokens in USD: No

Our highest intelligence Gemini 1.5 series model, with a breakthrough 2 million token context window.

* Input price
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $1.25, prompts <= 128k tokens$2.50, prompts > 128k tokens
* Output price
  * Free Tier: Free of charge
  * Paid Tier, per 1M tokens in USD: $5.00, prompts <= 128k tokens$10.00, prompts > 128k tokens
* Context caching price
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: $0.3125, prompts <= 128k tokens$0.625, prompts > 128k tokens
* Context caching (storage)
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: $4.50 per hour
* Tuning price
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: Not available
* Grounding with Google Search
  * Free Tier: Not available
  * Paid Tier, per 1M tokens in USD: $35 / 1K grounding requests
* Used to improve our products
  * Free Tier: Yes
  * Paid Tier, per 1M tokens in USD: No

#### Text Embedding 004

Our state-of-the-art text embedding model.

|                            |Free Tier     |Paid Tier, per 1M tokens in USD|
|----------------------------|--------------|-------------------------------|
|Input price                 |Free of charge|Not available                  |
|Output price                |Free of charge|Not available                  |
|Tuning price                |Not available |Not available                  |
|Used to improve our products|Yes           |No                             |

\[\*\] Google AI Studio usage is free of charge in all available regions. See Billing FAQs for details.

\[\*\*\] Prices may differ from the prices listed here and the prices offered on Vertex AI. For Vertex prices, see the Vertex AI pricing page.

\[\*\*\*\] If you are using dynamic retrieval to optimize costs, only requests that contain at least one grounding support URL from the web in their response are charged for Grounding with Google Search. Costs for Gemini always apply. Rate limits are subject to change.
