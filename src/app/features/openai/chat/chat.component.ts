import { Component, inject } from '@angular/core';
import { ChatCompletion, OpenAiService } from '../../../core/services/opei-ai.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  selector: 'app-chat',
  imports: [CommonModule,FormsModule, MaterialModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {
  prompt = '';            
  responseText = '';            
  loading = false;
  errorMsg: string | null = null;

  private aiService = inject(OpenAiService);

    async sendPrompt(): Promise<void> {
    if (!this.prompt.trim()) return;

    this.loading = true;
    this.errorMsg = null;
    this.responseText = '';

    try {
      const result: ChatCompletion = await this.aiService.sendMessage(this.prompt);
      this.responseText = result.choices?.[0]?.message?.content ?? '(no response)';
    } catch (err: any) {
      console.error(err);
      this.errorMsg = 'A apărut o eroare la apelul Groq: ' + (err?.message || err.toString());
    } finally {
      this.loading = false;
    }
  }
}