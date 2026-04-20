import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-social-top-bar',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './social-top-bar.component.html',
  styleUrl: './social-top-bar.component.css'
})
export class SocialTopBarComponent {}
