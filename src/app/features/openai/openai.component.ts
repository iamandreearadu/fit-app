import { Component, inject } from '@angular/core';
import { HeaderComponent } from "../../shared/components/header/header.component";
import { FooterComponent } from "../../shared/components/footer/footer.component";
import { GroqComponent } from './groq/groq.component';
import { GroqAiFacade } from '../../core/facade/groq-ai.facade';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../core/material/material.module';

@Component({
  selector: 'app-openai',
  imports: [HeaderComponent, FooterComponent,GroqComponent, CommonModule, GroqComponent, MaterialModule],
  templateUrl: './openai.component.html',
  styleUrl: './openai.component.css'
})
export class OpenaiComponent {

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
