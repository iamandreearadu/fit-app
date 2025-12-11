import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { GroqChatResponse } from '../core/models/groq-ai.model';

@Injectable({
  providedIn: 'root'
})
export class GroqAiApiService {

  private readonly apiKey = environment.groqApiKey;
  private readonly baseUrl = environment.groqApiUrl;

  constructor(private http: HttpClient) {}

  async askText(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    });

    const body = {
      model:'llama-3.1-8b-instant',

      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    };

    const res = await firstValueFrom(
      this.http.post<GroqChatResponse>(url, body, { headers })
    );

    return this.extractText(res);
  }

  async analyzeImage(prompt: string, file: File): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    });

    const base64 = await this.fileToBase64(file);
    const dataUrl = `data:${file.type};base64,${base64}`;

    const body = {
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || 'Describe this image in detail.',
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl   // conform docs: data:image/jpeg;base64,... :contentReference[oaicite:2]{index=2}
              }
            }
          ]
        }
      ],
      max_completion_tokens: 512,
      temperature: 0.4
    };

    const res = await firstValueFrom(
      this.http.post<GroqChatResponse>(url, body, { headers })
    );

    return this.extractText(res);
  }

  // ========== HELPERS ==========

  private extractText(res: GroqChatResponse): string {
    const choice = res.choices?.[0];
    if (!choice?.message?.content) return '';

    const content = choice.message.content;

    // Groq poate returna fie string simplu, fie array de "parts"
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
        const base64 = result.split(',')[1]; // scoatem prefixul data:
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });
  }
}
