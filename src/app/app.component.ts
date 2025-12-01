import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MoveUpComponent } from './shared/components/move-up/move-up.component';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterOutlet, MoveUpComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
}
