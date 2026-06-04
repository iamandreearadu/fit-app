import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MoveUpComponent } from './shared/components/move-up/move-up.component';
import { AiChatFabComponent } from './core/components/ai-chat-fab/ai-chat-fab.component';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, MoveUpComponent, AiChatFabComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
}
