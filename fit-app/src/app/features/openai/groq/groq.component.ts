import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
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
export class GroqComponent implements OnDestroy {

  facade = inject(GroqAiFacade);

  private scrollObserver?: MutationObserver;

  // ViewChild setter: fires when *ngIf makes #chatWindow available/unavailable
  @ViewChild('chatWindow') set chatWindow(el: ElementRef<HTMLElement> | undefined) {
    this.scrollObserver?.disconnect();
    if (el) {
      const node = el.nativeElement;
      // Scroll whenever child nodes are added (new messages rendered)
      this.scrollObserver = new MutationObserver(() => {
        node.scrollTop = node.scrollHeight;
      });
      this.scrollObserver.observe(node, { childList: true, subtree: true });
      // Scroll immediately on attach
      node.scrollTop = node.scrollHeight;
    }
  }

  loading = false;
  prompt = '';
  imageFile: File | null = null;
  imagePreview: string | null = null;

  ngOnDestroy(): void {
    this.scrollObserver?.disconnect();
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
    reader.onload = () => this.imagePreview = reader.result as string;
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
