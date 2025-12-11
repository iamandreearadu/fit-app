import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatCompletion {
  choices: { 
    message: { 
        role: string; 
        content: string 
    } }[];
}


@Injectable({ providedIn: 'root' })
export class OpenAiService {
  private apiKey = environment.groqApiKey;
  private apiUrl = environment.groqApiUrl;
  private http = inject(HttpClient);


  sendMessage$(prompt: string): Observable<ChatCompletion> {
    const url = `${this.apiUrl}/chat/completions`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    });
    const body = {
     // model: 'gpt-3.5-turbo',
      model:'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
    };
    return this.http.post<ChatCompletion>(url, body, { headers });
  }

  async sendMessage(prompt: string): Promise<ChatCompletion> {
    return firstValueFrom(this.sendMessage$(prompt));
  }
}
