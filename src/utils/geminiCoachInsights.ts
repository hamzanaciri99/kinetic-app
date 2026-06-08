import { requestGeminiJson } from './geminiClient';

export type CoachInsights = {
  weekSummary: string;
  monthSummary: string;
  tips: string[];
};

const INSIGHTS_SCHEMA = {
  type: 'object',
  properties: {
    weekSummary: { type: 'string', description: 'A factual 1-2 sentence recap of the last 7 days across training, meals, and body weight' },
    monthSummary: { type: 'string', description: 'A factual 1-2 sentence recap of the last 30 days across training, meals, and body weight' },
    tips: {
      type: 'array',
      items: { type: 'string' },
      description: 'Up to 3 short, practical tips — only if the training or diet data shows a real gap. Empty array if things look on track.',
    },
  },
  required: ['weekSummary', 'monthSummary', 'tips'],
};

function buildInsightsPrompt(context: string): string {
  return (
    `You are an encouraging fitness and nutrition coach AI reviewing a user's logged app data. Here is a summary of their recent activity: ${context} ` +
    'Respond with: (1) "weekSummary" — a factual 1-2 sentence recap of their last 7 days across training, meals, and body-weight progress, ' +
    '(2) "monthSummary" — a factual 1-2 sentence recap of their last 30 days, and ' +
    '(3) "tips" — up to 3 short, practical, encouraging tips, but ONLY if the training or diet data shows a real gap ' +
    '(e.g. too few sessions, calorie intake far from target, stalled progress); return an empty array if things look on track. ' +
    'Stay strictly grounded in the numbers given, never invent data, and do not give medical advice. Respond only with the requested JSON.'
  );
}

const METRIC_SCHEMA = {
  type: 'object',
  properties: {
    explanation: { type: 'string', description: 'A short 2-3 sentence explanation of the metric plus one practical suggestion' },
  },
  required: ['explanation'],
};

function buildMetricPrompt(metricName: string, context: string): string {
  return (
    `You are a fitness coach AI. A user's dashboard currently shows a "${metricName}" metric. Here is the underlying data behind it: ${context} ` +
    'In 2-3 concise sentences, explain in plain language what is driving this figure right now and offer one practical, encouraging suggestion. ' +
    'Stay strictly grounded in the data given, never invent numbers, and do not give medical advice. Respond only with the requested JSON.'
  );
}

async function callGemini<T>(prompt: string, schema: object, parse: (raw: any) => T | null): Promise<T> {
  const text = await requestGeminiJson([{ text: prompt }], schema, 'Add EXPO_PUBLIC_GEMINI_API_KEY to a .env.local file to use AI insights.');

  const result = parse(JSON.parse(text));
  if (result === null) {
    throw new Error('Gemini did not return a usable result.');
  }
  return result;
}

/**
 * Generates a week/month recap plus tips from a plain-text summary of the user's
 * logged training, nutrition, and body-weight data.
 *
 * Requires `EXPO_PUBLIC_GEMINI_API_KEY` — get a free key at https://aistudio.google.com/apikey
 * and add it to a `.env.local` file in the project root.
 */
export async function generateCoachInsights(context: string): Promise<CoachInsights> {
  return callGemini(buildInsightsPrompt(context), INSIGHTS_SCHEMA, (raw) => {
    const weekSummary = typeof raw?.weekSummary === 'string' ? raw.weekSummary.trim() : '';
    const monthSummary = typeof raw?.monthSummary === 'string' ? raw.monthSummary.trim() : '';
    if (!weekSummary || !monthSummary) return null;
    const tips = Array.isArray(raw?.tips) ? raw.tips.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0) : [];
    return { weekSummary, monthSummary, tips };
  });
}

/**
 * Asks Gemini to explain what is driving a specific dashboard metric (e.g. "Recovery",
 * "Training Load") given a plain-text summary of the data behind it.
 */
export async function explainMetric(metricName: string, context: string): Promise<string> {
  return callGemini(buildMetricPrompt(metricName, context), METRIC_SCHEMA, (raw) => {
    const explanation = typeof raw?.explanation === 'string' ? raw.explanation.trim() : '';
    return explanation ? explanation : null;
  });
}
