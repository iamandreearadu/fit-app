import { Component, EventEmitter, inject, Output } from '@angular/core';
import { GroqAiFacade } from '../../../core/facade/groq-ai.facade';
import { MaterialModule } from '../../../core/material/material.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-groq-sidenav',
  imports: [CommonModule,MaterialModule],
  templateUrl: './groq-sidenav.component.html',
  styleUrl: './groq-sidenav.component.css'
})
export class GroqSidenavComponent {
  facade = inject(GroqAiFacade);
  @Output() conversationSelected = new EventEmitter<void>();

  newChat() {
    this.facade.startConversation();
  }

  openConversation(id: string) {
    this.conversationSelected.emit();
    void this.facade.openConversation(id);
  }

  delete(id: string) {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
    this.facade.deleteConversation(id);
  }
}
