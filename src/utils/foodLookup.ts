export type FoodReference = {
  name: string;
  gramsPerServing: number;
  kcalPerGram: number;
  proteinPerGram: number;
  carbsPerGram: number;
  fatPerGram: number;
};

const OFF_FIELDS = 'product_name,nutriments,serving_quantity';

/** Looks up a packaged food product by barcode via the free Open Food Facts API (no key required). */
export async function lookupBarcodeProduct(barcode: string): Promise<FoodReference | null> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.status !== 1 || !data.product) return null;

  const product = data.product;
  const nutriments = product.nutriments ?? {};
  const kcalPer100g = nutriments['energy-kcal_100g'];
  if (typeof kcalPer100g !== 'number') return null;

  const servingGrams = typeof product.serving_quantity === 'number' && product.serving_quantity > 0 ? product.serving_quantity : 100;

  return {
    name: product.product_name?.trim() || 'Scanned Product',
    gramsPerServing: servingGrams,
    kcalPerGram: kcalPer100g / 100,
    proteinPerGram: (nutriments['proteins_100g'] ?? 0) / 100,
    carbsPerGram: (nutriments['carbohydrates_100g'] ?? 0) / 100,
    fatPerGram: (nutriments['fat_100g'] ?? 0) / 100,
  };
}
