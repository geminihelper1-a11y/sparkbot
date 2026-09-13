# Gemini image generation

Spark uses Google's current stable native image model `gemini-3.1-flash-image` (Nano Banana 2) through the official Gemini Interactions REST API.

Required Railway variable:
`GEMINI_API_KEY=...`

Optional override:
`GEMINI_IMAGE_MODEL=gemini-3.1-flash-image`

The image path requests a 16:9 PNG at 2K output and applies Spark's NETHRION visual style guide before the user prompt.

The bot does not need an OpenAI API key for image generation in this build.
