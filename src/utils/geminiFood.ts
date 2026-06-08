import { FoodReference } from './foodLookup';
import { requestGeminiJson } from './geminiClient';

const PROMPT =
  'You are a nutrition estimation assistant. Look at this photo of food and identify what it is. ' +
  'Estimate the total portion shown in grams, and the total calories, protein, carbohydrates, and fat ' +
  '(in grams) for that whole portion. Respond only with the requested JSON.';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Short name of the food or dish' },
    estimatedGrams: { type: 'number', description: 'Estimated total weight of the portion shown, in grams' },
    kcal: { type: 'number', description: 'Estimated total calories for the portion' },
    protein: { type: 'number', description: 'Estimated total protein in grams for the portion' },
    carbs: { type: 'number', description: 'Estimated total carbohydrates in grams for the portion' },
    fat: { type: 'number', description: 'Estimated total fat in grams for the portion' },
  },
  required: ['name', 'estimatedGrams', 'kcal', 'protein', 'carbs', 'fat'],
};

/**
 * Sends a base64-encoded food photo to Gemini and returns a normalized per-gram macro
 * reference (same shape as `lookupBarcodeProduct`) so both paths can feed the same UI.
 *
 * Requires `EXPO_PUBLIC_GEMINI_API_KEY` — get a free key at https://aistudio.google.com/apikey
 * and add it to a `.env.local` file in the project root.
 */
export async function analyzeFoodPhoto(base64: string): Promise<FoodReference> {
  const text = await requestGeminiJson(
    [{ text: PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }],
    RESPONSE_SCHEMA,
    'Add EXPO_PUBLIC_GEMINI_API_KEY to a .env.local file to use AI food scanning.'
  );

  const parsed = JSON.parse(text) as { name: string; estimatedGrams: number; kcal: number; protein: number; carbs: number; fat: number };
  const grams = parsed.estimatedGrams > 0 ? parsed.estimatedGrams : 100;

  return {
    name: parsed.name?.trim() || 'Scanned Food',
    gramsPerServing: grams,
    kcalPerGram: parsed.kcal / grams,
    proteinPerGram: parsed.protein / grams,
    carbsPerGram: parsed.carbs / grams,
    fatPerGram: parsed.fat / grams,
  };
}
