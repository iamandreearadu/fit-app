import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  BASE_SYSTEM_PROMPT,
  IMAGE_FOOD_PROMPT,
  IMAGE_GENERIC_PROMPT,
  IMAGE_MACROS_PROMPT,
  OUTPUT_FORMAT_PROMPT,
  OUTPUT_FORMAT_PROMPT_FOR_MACROS,
} from '../core/system-prompt/ai-prompts';
import { MealMacros } from '../core/models/meal-macros';
import { ModuleContext } from '../core/models/groq-ai.model';
import { UserProfile } from '../core/models/user.model';
import { WorkoutTemplate } from '../core/models/workouts-tab.model';

interface AiResponse {
  content: string;
}

/** API service for calling the Groq inference endpoints (POST /api/ai). */
@Injectable({ providedIn: 'root' })
export class AiInferenceService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/ai`;

  // ================= TEXT =================

  async askText(prompt: string, moduleContext?: ModuleContext): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<AiResponse>(`${this.baseUrl}/text`, {
        prompt,
        systemPrompt: `${BASE_SYSTEM_PROMPT}\n\n${OUTPUT_FORMAT_PROMPT}`,
        moduleContext: moduleContext ?? null,
      }),
    );
    return this.validateGenericResponse(res.content);
  }

  // ================= IMAGE =================

  async analyzeImage(prompt: string, file: File): Promise<string> {
    const base64 = await this.fileToBase64(file);
    const res = await firstValueFrom(
      this.http.post<AiResponse>(`${this.baseUrl}/image`, {
        prompt: prompt || 'Analyze this image.',
        base64Image: base64,
        mimeType: file.type || 'image/jpeg',
        systemPrompt: `${OUTPUT_FORMAT_PROMPT}\n\n${BASE_SYSTEM_PROMPT}\n\n${IMAGE_GENERIC_PROMPT}\n\n${IMAGE_FOOD_PROMPT}`,
        temperature: 0.3,
      }),
    );
    return this.validateFoodImageResponse(res.content);
  }

  // ================= MEAL MACROS FROM IMAGE =================

  async analyzeMealImage(file: File): Promise<MealMacros> {
    const base64 = await this.fileToBase64(file);
    let res: AiResponse;
    try {
      res = await firstValueFrom(
        this.http.post<AiResponse>(`${this.baseUrl}/image`, {
          prompt:
            'Analyze this meal photo and return ONLY the JSON as specified.',
          base64Image: base64,
          mimeType: file.type || 'image/jpeg',
          systemPrompt: `${OUTPUT_FORMAT_PROMPT_FOR_MACROS}\n\n${IMAGE_MACROS_PROMPT}`,
        }),
      );
    } catch (err: unknown) {
      const e = err as { error?: { detail?: string; title?: string }; message?: string };
      const detail = e?.error?.detail ?? e?.error?.title ?? e?.message ?? 'AI analysis failed.';
      console.error('[AI IMAGE] Backend error:', detail, err);
      throw new Error(detail);
    }
    const json = this.safeExtractJson(res.content);
    return this.validateMealMacros(json);
  }

  // ================= WORKOUT CALORIE ESTIMATE =================

  async calculateWorkoutCalories(
    user: UserProfile,
    workout: WorkoutTemplate,
  ): Promise<{ calories: number; explanation: string }> {
    const res = await firstValueFrom(
      this.http.post<AiResponse>(`${this.baseUrl}/workout-calories`, {
        user: {
          weightKg: user.weightKg,
          heightCm: user.heightCm,
          age: user.age,
          gender: user.gender,
          activity: user.activity,
        },
        workout: {
          title: workout.title,
          type: workout.type,
          durationMin: workout.durationMin,
          exercises: workout.exercises ?? [],
          cardio: workout.cardio ?? null,
        },
      }),
    );

    try {
      const parsed = this.safeExtractJson(res.content);
      return {
        calories: Math.round(Number(parsed['calories']) || 0),
        explanation: String(parsed['explanation'] || ''),
      };
    } catch {
      return {
        calories: 0,
        explanation:
          res.content?.trim() || 'Could not estimate calories at this time.',
      };
    }
  }

  // ================= HELPERS =================

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    });
  }

  private validateGenericResponse(text: string): string {
    if (!text || text.length < 20) {
      return 'TITLE:\nInformation unavailable\n\nDESCRIPTION:\nThe response could not be generated reliably at this time.';
    }
    return text.trim();
  }

  private validateFoodImageResponse(text: string): string {
    if (!text || text.length < 40)
      return this.foodFallback('Empty or too short response');
    const required = ['Calories', 'Protein', 'Carbohydrates', 'Fats'];
    const hasMacros = required.every((m) =>
      text.toLowerCase().includes(m.toLowerCase()),
    );
    if (!hasMacros) return this.foodFallback('Missing macronutrients');
    return text.trim();
  }

  private foodFallback(reason?: string): string {
    console.warn('[AI FOOD IMAGE FALLBACK]', reason);
    return 'TITLE:\nFood analysis unavailable\n\nDESCRIPTION:\nThe food in the image could not be confidently analyzed.\n\nUNCERTAINTIES:\n- Image quality, portion size, or ingredients are unclear.';
  }

  private safeExtractJson(raw: string): Record<string, unknown> {
    const text = (raw || '').trim();
    try {
      return JSON.parse(text);
    } catch {
      // fallback: strip markdown fences then retry below
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error('No JSON found in AI response');
  }

  private validateMealMacros(obj: Record<string, unknown>): MealMacros {
    const n = (v: unknown) => {
      const x = Number(v);
      return !isFinite(x) || x < 0 ? 0 : Math.round(x * 10) / 10;
    };
    return {
      protein_g: n(obj?.['protein_g']),
      carbs_g: n(obj?.['carbs_g']),
      fats_g: n(obj?.['fats_g']),
      calories_kcal:
        obj?.['calories_kcal'] != null ? n(obj['calories_kcal']) : undefined,
      items: Array.isArray(obj?.['items'])
        ? (obj['items'] as Record<string, unknown>[]).map((it) => ({
            name: String(it?.['name'] ?? ''),
            confidence: it?.['confidence'] != null ? Number(it['confidence']) : undefined,
            protein_g: it?.['protein_g'] != null ? n(it['protein_g']) : undefined,
            carbs_g: it?.['carbs_g'] != null ? n(it['carbs_g']) : undefined,
            fats_g: it?.['fats_g'] != null ? n(it['fats_g']) : undefined,
            calories_kcal: it?.['calories_kcal'] != null ? n(it['calories_kcal']) : undefined,
          }))
        : [],
    };
  }
}
