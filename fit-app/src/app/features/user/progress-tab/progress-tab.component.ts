import { Component } from '@angular/core';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  standalone: true,
  selector: 'app-progress-tab',
  imports: [MaterialModule],
  templateUrl: './progress-tab.component.html',
  styleUrl: '../coming-soon-tab.css',
})
export class ProgressTabComponent {}
