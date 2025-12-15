import { Component, inject, OnInit } from '@angular/core';
import { GroqAiFacade } from '../../../core/facade/groq-ai.facade';
import { MaterialModule } from '../../../core/material/material.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-groq-sidenav',
  imports: [CommonModule,MaterialModule],
  templateUrl: './groq-sidenav.component.html',
  styleUrl: './groq-sidenav.component.css'
})
export class GroqSidenavComponent implements OnInit {
  facade = inject(GroqAiFacade);

  ngOnInit() {
    this.facade.loadConversations();
  }

  newChat() {
    this.facade.startConversation();
  }

  openConversation(id: string) {
    this.facade.openConversation(id);
  }

  delete(id: string) {
    const confirmDelete = confirm('Are you sure you want to delete this conversation?');
    if (!confirmDelete) return;

    this.facade.deleteConversation(id);
  }
}
