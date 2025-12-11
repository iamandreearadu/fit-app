import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from '../../../core/material/material.module';
import { GroqAiFacade } from '../../../core/facade/groq-ai.facade';

@Component({
  selector: 'app-groq',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './groq.component.html',
  styleUrl: './groq.component.css'
})
export class GroqComponent {

  facade = inject(GroqAiFacade);

  prompt = '';
  imageFile: File | null = null;
  imagePreview: string | null = null;

  // LOAD ALL CONVERSATIONS AT INIT
  async ngOnInit() {
    await this.facade.loadConversations();
  }

  // ============================
  // IMAGE HANDLING
  // ============================
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.imageFile = file;

    // preview
    const reader = new FileReader();
    reader.onload = e => this.imagePreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  // ============================
  // SEND MESSAGE
  // ============================
  async send() {
    if (!this.prompt.trim() && !this.imageFile) return;

    await this.facade.askAI(this.prompt, this.imageFile ?? undefined);

    // reset input
    this.prompt = '';
    this.imageFile = null;
    this.imagePreview = null;
  }

  // Allow ENTER to send
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  // ============================
  // OPEN SAVED CONVERSATION
  // ============================
  openConversation(convId: string) {
    this.facade.openConversation(convId);
  }
}

//   prompt = '';
//   responseText = '';
//   errorMsg = '';
//   loading = false;

//   imageFile: File | null = null;
//   imagePreview: string | null = null;
//   private groqService = inject(GroqService);

//   onFileSelected(event: Event) {
//     const input = event.target as HTMLInputElement;
//     const file = input.files?.[0] || null;
//     this.imageFile = file;
//     this.errorMsg = '';

//     if (file) {
//       const reader = new FileReader();
//       reader.onload = () => {
//         this.imagePreview = reader.result as string;
//       };
//       reader.readAsDataURL(file);
//     } else {
//       this.imagePreview = null;
//     }
//   }

//   async send() {
//     this.errorMsg = '';
//     this.responseText = '';

//     const trimmed = this.prompt.trim();

//     if (!trimmed && !this.imageFile) {
//       this.errorMsg = 'Please type a question or upload an image.';
//       return;
//     }

//     this.loading = true;
//     try {
//       if (this.imageFile) {
//         // Vision: text + imagine
//         this.responseText = await this.groqService.analyzeImage(
//           trimmed || 'Describe this image in detail.',
//           this.imageFile
//         );
//       } else {
//         // Doar text
//         this.responseText = await this.groqService.askText(trimmed);
//       }
//     } catch (err) {
//       console.error(err);
//       this.errorMsg = 'Something went wrong while calling Groq API.';
//     } finally {
//       this.loading = false;
//     }
//   }

//   onKeyDown(event: KeyboardEvent) {
//     // Enter = trimite (fără Shift)
//     if (event.key === 'Enter' && !event.shiftKey) {
//       event.preventDefault();
//       if (!this.loading) {
//         this.send();
//       }
//     }
//   }
// }