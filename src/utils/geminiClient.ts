const MODEL = 'gemini-2.5-flash';
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Posts a `generateContent` request to Gemini with structured-output JSON and returns the
 * raw response text. Free-tier API keys are rate-limited (HTTP 429) under light concurrent
 * use — e.g. several screens requesting AI insights around the same time — so 429s are
 * retried with backoff before surfacing a friendly "rate limited" error.
 *
 * Requires `EXPO_PUBLIC_GEMINI_API_KEY` — get a free key at https://aistudio.google.com/apikey
 * and add it to a `.env.local` file in the project root.
 */
export async function requestGeminiJson(parts: unknown[], schema: object, missingKeyMessage: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(missingKeyMessage);
  }

  let lastStatus = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini did not return a result.');
      }
      return text;
    }

    lastStatus = response.status;
    if (lastStatus !== 429 || attempt === MAX_ATTEMPTS) break;
    await delay(RETRY_DELAY_MS * attempt);
  }

  if (lastStatus === 429) {
    throw new Error("Gemini's free-tier rate limit was reached — wait a minute and try again.");
  }
  throw new Error(`Gemini request failed (${lastStatus}). Check your API key and try again.`);
}
