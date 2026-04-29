export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand?: string;
  macrosPer100g: {
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    calories_kcal: number;
  };
  nutriScore?: string;  // 'A'–'E'
  novaGroup?: number;   // 1–4
  qualityScore: number; // 1–10
  qualityLabel: string;
  imageUrl?: string;
  servingSizeG: number;
}
