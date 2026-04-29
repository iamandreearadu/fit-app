import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BarcodeProduct } from '../core/models/barcode-product.model';

interface OFFProduct {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  nutriments?: Record<string, number>;
  nutriscore_grade?: string;
  nova_group?: number;
  image_front_url?: string;
  serving_quantity?: string;
}

interface OFFResponse {
  status: number;
  product?: OFFProduct;
}

@Injectable({ providedIn: 'root' })
export class OpenFoodFactsService {
  private http = inject(HttpClient);

  async getByBarcode(barcode: string): Promise<BarcodeProduct> {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const data = await firstValueFrom(this.http.get<OFFResponse>(url));

    if (data.status !== 1 || !data.product) {
      throw new Error('Product not found in database.');
    }

    const p = data.product;
    const n = p.nutriments ?? {};

    const protein = Math.round((n['proteins_100g'] ?? 0) * 10) / 10;
    const carbs   = Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10;
    const fats    = Math.round((n['fat_100g'] ?? 0) * 10) / 10;
    const kcal    = Math.round(n['energy-kcal_100g'] ?? (n['energy_100g'] ?? 0) / 4.184);

    const { score, label } = this.computeQuality(p.nutriscore_grade, p.nova_group, protein, fats);

    return {
      barcode,
      name: p.product_name || p.product_name_en || 'Unknown product',
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      macrosPer100g: { protein_g: protein, carbs_g: carbs, fats_g: fats, calories_kcal: kcal },
      nutriScore: p.nutriscore_grade?.toUpperCase(),
      novaGroup: p.nova_group,
      qualityScore: score,
      qualityLabel: label,
      imageUrl: p.image_front_url,
      servingSizeG: p.serving_quantity ? (parseFloat(p.serving_quantity) || 100) : 100,
    };
  }

  private computeQuality(
    nutriScore: string | undefined,
    nova: number | undefined,
    protein100: number,
    fat100: number,
  ): { score: number; label: string } {
    let score: number;

    if (nutriScore) {
      const nsMap: Record<string, number> = { a: 10, b: 8, c: 6, d: 4, e: 2 };
      score = nsMap[nutriScore.toLowerCase()] ?? 5;
    } else {
      score = Math.min(9, Math.max(2, Math.round(5 + protein100 / 10 - fat100 / 15)));
    }

    if (nova === 4) score = Math.max(1, score - 2);
    else if (nova === 3) score = Math.max(1, score - 1);

    score = Math.round(score);

    const labels: Record<number, string> = {
      10: 'Excellent', 9: 'Excellent',
      8: 'Good',       7: 'Good',
      6: 'Moderate',   5: 'Moderate',
      4: 'Poor',       3: 'Poor',
      2: 'Very Poor',  1: 'Very Poor',
    };

    return { score, label: labels[score] ?? 'Moderate' };
  }
}
