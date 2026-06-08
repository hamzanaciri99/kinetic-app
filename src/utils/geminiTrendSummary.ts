import { requestGeminiJson } from './geminiClient';

export type TrendDataPoint = { label: string; value: number };

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'A short, factual 1-2 sentence summary of the trend' },
  },
  required: ['summary'],
};

function buildPrompt(metricLabel: string, unit: string, periodLabel: string, points: TrendDataPoint[]): string {
  const series = points.map((p) => `${p.label}: ${p.value}${unit}`).join(', ');
  return (
    `You are a fitness data analyst. Here is a user's ${periodLabel} ${metricLabel} trend (in ${unit}): ${series}. ` +
    'In one or two concise, factual sentences, summarize the trend — note whether it is rising, falling, ' +
    'steady, or fluctuating, and call out anything notable. Be encouraging but do not give medical advice ' +
    'or invent numbers beyond what is given. Respond only with the requested JSON.'
  );
}

/**
 * Sends a labeled time series to Gemini and returns a short, factual natural-language
 * summary of the trend (e.g. "Your calorie intake has trended down over the past week...").
 *
 * Requires `EXPO_PUBLIC_GEMINI_API_KEY` — get a free key at https://aistudio.google.com/apikey
 * and add it to a `.env.local` file in the project root.
 */
export async function analyzeTrend(metricLabel: string, unit: string, periodLabel: string, points: TrendDataPoint[]): Promise<string> {
  const text = await requestGeminiJson(
    [{ text: buildPrompt(metricLabel, unit, periodLabel, points) }],
    RESPONSE_SCHEMA,
    'Add EXPO_PUBLIC_GEMINI_API_KEY to a .env.local file to use AI trend summaries.'
  );

  const parsed = JSON.parse(text) as { summary: string };
  const summary = parsed.summary?.trim();
  if (!summary) {
    throw new Error('Gemini did not return a summary.');
  }
  return summary;
}
