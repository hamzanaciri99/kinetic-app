import { requestGeminiJson } from './geminiClient';

const PROMPT =
  'You are a fitness progress assistant. Compare these two physique photos — the first is the "before" photo, ' +
  'the second is the "after" photo. In one concise, factual sentence, describe the visible physical change you ' +
  'observe (e.g. changes in muscle definition, body composition, posture). Do not invent specific numeric ' +
  'percentages or measurements — describe only what is visibly apparent. Respond only with the requested JSON.';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string', description: 'One concise, factual sentence describing the visible change between the two photos' },
  },
  required: ['description'],
};

/**
 * Sends a "before" and "after" progress photo (as Base64 JPEGs) to Gemini and returns
 * a short, factual description of the visible change between them.
 *
 * Requires `EXPO_PUBLIC_GEMINI_API_KEY` — get a free key at https://aistudio.google.com/apikey
 * and add it to a `.env.local` file in the project root.
 */
export async function analyzeProgressComparison(beforeBase64: string, afterBase64: string): Promise<string> {
  const text = await requestGeminiJson(
    [
      { text: PROMPT },
      { inline_data: { mime_type: 'image/jpeg', data: beforeBase64 } },
      { inline_data: { mime_type: 'image/jpeg', data: afterBase64 } },
    ],
    RESPONSE_SCHEMA,
    'Add EXPO_PUBLIC_GEMINI_API_KEY to a .env.local file to use AI progress comparison.'
  );

  const parsed = JSON.parse(text) as { description: string };
  const description = parsed.description?.trim();
  if (!description) {
    throw new Error('Gemini did not return a description. Try clearer before/after photos.');
  }
  return description;
}

export type ProgressAnalysis = {
  physiqueChange: string;
  focusAssessment: string;
  dietAndTrainingFeedback: string;
};

const ANALYSIS_PROMPT =
  'You are a fitness progress coach. Compare these two physique photos — the first is the "before" photo, the ' +
  'second is the "after" photo. You are also given the user\'s recent training, nutrition, and body-weight history ' +
  'as plain text context. Using both the photos and that context, respond with a full assessment covering: the ' +
  'visible change in physique between the photos, whether the user should prioritize losing fat, building muscle, ' +
  'or maintaining their current course, and whether their logged training and nutrition support that goal with one ' +
  'practical suggestion for what to adjust. Do not invent specific numeric percentages or measurements that are not ' +
  'present in the provided context — describe only what is visibly apparent or supported by the context. Respond ' +
  'only with the requested JSON.\n\nUser context:\n';

const ANALYSIS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    physiqueChange: {
      type: 'string',
      description: '2-3 factual sentences describing the visible change in body composition, shape, and muscle definition between the before and after photos',
    },
    focusAssessment: {
      type: 'string',
      description: 'Based on the photos and the provided history, 1-2 sentences on whether the user appears to be losing fat, building muscle, or maintaining — and which of those they should prioritize next',
    },
    dietAndTrainingFeedback: {
      type: 'string',
      description: "2-3 sentences assessing whether the user's logged training and nutrition over the period support that goal, with one practical suggestion for what to adjust",
    },
  },
  required: ['physiqueChange', 'focusAssessment', 'dietAndTrainingFeedback'],
};

/**
 * Sends a "before"/"after" progress photo pair plus a plain-text summary of the user's logged
 * training, nutrition, and body-weight history to Gemini, and returns a full multi-part analysis:
 * the visible physique change, whether to prioritize fat loss vs. muscle gain, and feedback on
 * whether the user's logged habits support that goal.
 *
 * Requires `EXPO_PUBLIC_GEMINI_API_KEY` — get a free key at https://aistudio.google.com/apikey
 * and add it to a `.env.local` file in the project root.
 */
export async function analyzeProgressInDepth(beforeBase64: string, afterBase64: string, context: string): Promise<ProgressAnalysis> {
  const text = await requestGeminiJson(
    [
      { text: `${ANALYSIS_PROMPT}${context}` },
      { inline_data: { mime_type: 'image/jpeg', data: beforeBase64 } },
      { inline_data: { mime_type: 'image/jpeg', data: afterBase64 } },
    ],
    ANALYSIS_RESPONSE_SCHEMA,
    'Add EXPO_PUBLIC_GEMINI_API_KEY to a .env.local file to use AI progress analysis.'
  );

  const parsed = JSON.parse(text) as ProgressAnalysis;
  const physiqueChange = parsed.physiqueChange?.trim();
  const focusAssessment = parsed.focusAssessment?.trim();
  const dietAndTrainingFeedback = parsed.dietAndTrainingFeedback?.trim();
  if (!physiqueChange || !focusAssessment || !dietAndTrainingFeedback) {
    throw new Error('Gemini did not return a complete analysis. Try clearer before/after photos.');
  }
  return { physiqueChange, focusAssessment, dietAndTrainingFeedback };
}
