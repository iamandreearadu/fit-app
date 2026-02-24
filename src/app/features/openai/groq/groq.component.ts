import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, ViewChild, effect, inject } from '@angular/core';
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
export class GroqComponent implements AfterViewChecked {

  facade = inject(GroqAiFacade);

  @ViewChild('chatWindow') private chatWin!: ElementRef<HTMLElement>;

  loading = false;
  prompt = '';
  imageFile: File | null = null;
  imagePreview: string | null = null;

  private shouldScroll = false;

  constructor() {
    effect(() => {
      this.facade.messages();
      this.shouldScroll = true;
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    const el = this.chatWin?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async ngOnInit() {
    this.loading = true;
    try {
    await this.facade.loadConversations();
    } finally {
      this.loading = false;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.imageFile = file;

    const reader = new FileReader();
    reader.onload = e => this.imagePreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  async send() {
    if (!this.prompt.trim() && !this.imageFile) return;

    await this.facade.askAI(
      this.prompt, 
      this.imageFile ?? undefined,
      this.imagePreview ?? undefined
);

    this.prompt = '';
    this.imageFile = null;
    this.imagePreview = null;
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  openConversation(convId: string) {
    this.facade.openConversation(convId);
  }
}
