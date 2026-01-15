import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { GroqChatResponse } from '../core/models/groq-ai.model';
import { BASE_SYSTEM_PROMPT, IMAGE_FOOD_PROMPT, IMAGE_GENERIC_PROMPT, IMAGE_MACROS_PROMPT, OUTPUT_FORMAT_PROMPT, OUTPUT_FORMAT_PROMPT_FOR_MACROS } from '../core/system-prompt/ai-prompts';
import { MealMacros } from '../core/models/meal-macros';
import { AlertService } from '../shared/services/alert.service';

export enum AiResponseType {
  FOOD_IMAGE = 'food_image',
  GENERIC_IMAGE = 'generic_image',
  GENERIC_ANSWER = 'generic_answer',
}

@Injectable({
  providedIn: 'root'
})
export class GroqAiApiService {

  private readonly apiKey = environment.groqApiKey;
  private readonly baseUrl = environment.groqApiUrl;

  private http = inject(HttpClient);
  


    // ================= TEXT =================

  async askText(prompt: string): Promise<string> {
    const res = await this.sendRequest({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        { role: 'system', content: OUTPUT_FORMAT_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6
    });

    const text = this.extractText(res);

    return this.validateResponse(
      text,
      AiResponseType.GENERIC_ANSWER
    );
  }

    // ---------------- CHAT IMAGE ----------------

    
  async analyzeImage(prompt: string, file: File): Promise<string> {
    const base64 = await this.fileToBase64(file);

    const res = await this.sendRequest({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: OUTPUT_FORMAT_PROMPT },
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        { role: 'system', content: IMAGE_GENERIC_PROMPT },
        { role: 'system', content: IMAGE_FOOD_PROMPT },

        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || 'Analyze this image.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${file.type};base64,${base64}`
              }
            }
          ]
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 512
    });

    const text = this.extractText(res);

    return this.validateResponse(
      text,
      AiResponseType.FOOD_IMAGE || AiResponseType.GENERIC_IMAGE
    );
  }  



   // ---------------- IMAGE & EXTRACT MACROS ----------------
  async analyzeMealImage(file: File): Promise<MealMacros> {
    const base64 = await this.fileToBase64(file);

    const res = await this.sendRequest({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: OUTPUT_FORMAT_PROMPT_FOR_MACROS },
        { role: 'system', content: IMAGE_MACROS_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this meal photo and return ONLY the JSON as specified.' },
            { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } }
          ]
        }
      ],
      temperature: 0.2,
      max_completion_tokens: 512
    });

    const raw = this.extractText(res);
    const json = this.safeExtractJson(raw);
    const validated = this.validateMealMacros(json);
    return validated;
  }


   // ================= CORE REQUEST =================

  private async sendRequest(body: any): Promise<GroqChatResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    });

    return firstValueFrom(
      this.http.post<GroqChatResponse>(
        `${this.baseUrl}/chat/completions`,
        body,
        { headers }
      )
    );
  }

  // ================= VALIDATION =================

    private validateGenericHealthResponse(text: string): string {
        if (!text || text.length < 20) {
          return `
      TITLE:
      Information unavailable

      DESCRIPTION:
      The response could not be generated reliably at this time.
      `.trim();
        }

        return text.trim();
      }

   private validateGenericImageResponse(text: string): string {
          if (!text || text.length < 20) {
            return `
        TITLE:
        Image analysis unavailable

        DESCRIPTION:
        The image could not be reliably analyzed.

        INSIGHTS:
        - No clear fitness or health-related details detected.

        `.trim();
          }
        return text.trim();
}



  private validateFoodImageResponse(text: string): string {
      if (!text || text.length < 40) {
        return this.foodFallback('Empty or too short response');
      }

      const hardRequirements = [
        'Calories',
        'Protein',
        'Carbohydrates',
        'Fats'
      ];

      const hasMacros = hardRequirements.every(m =>
        text.toLowerCase().includes(m.toLowerCase())
      );

      if (!hasMacros) {
        return this.foodFallback('Missing macronutrients');
      }

          return text.trim();
        }

  private validateResponse(
          text: string,
          type: AiResponseType
        ): string {
          switch (type) {
            case AiResponseType.FOOD_IMAGE:
              return this.validateFoodImageResponse(text);

            case AiResponseType.GENERIC_IMAGE:
              return this.validateGenericImageResponse(text);

            case AiResponseType.GENERIC_ANSWER:
            default:
              return this.validateGenericHealthResponse(text);
          }
        }      

  
    private foodFallback(reason?: string): string {
        console.warn('[AI FOOD IMAGE FALLBACK]', reason);

        return `
    TITLE:
    Food analysis unavailable

    DESCRIPTION:
    The food in the image could not be confidently analyzed.

    UNCERTAINTIES:
    - Image quality, portion size, or ingredients are unclear.

    `.trim();
      }

  // ========== HELPERS ==========

  private extractText(res: GroqChatResponse): string {
    const choice = res.choices?.[0];
    if (!choice?.message?.content) return '';

    const content = choice.message.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map(part => part.text ?? '')
        .join('\n')
        .trim();
    }

    return '';
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });
  }


    // --- JSON extract/validate ---
  private safeExtractJson(raw: string): any {
  
    const trimmed = (raw || '').trim();
    try { return JSON.parse(trimmed); } catch (_) { /* continue */ }
    const match = trimmed.match(/\{[\s\S]*\}$/);
    if (!match) throw new Error('No JSON found in AI response');
    return JSON.parse(match[0]);
  }

  private validateMealMacros(obj: any): MealMacros {
    const n = (v: unknown) => {
      const x = Number(v);
      if (!isFinite(x) || x < 0) return 0;
      return Math.round(x * 10) / 10; 
    };
    return {
      protein_g: n(obj?.protein_g),
      carbs_g: n(obj?.carbs_g),
      fats_g: n(obj?.fats_g),
      calories_kcal: obj?.calories_kcal != null ? n(obj.calories_kcal) : undefined,
      items: Array.isArray(obj?.items) ? obj.items.map((it: any) => ({
        name: String(it?.name ?? ''),
        confidence: it?.confidence != null ? Number(it.confidence) : undefined
      })) : []
    };
  }
}
