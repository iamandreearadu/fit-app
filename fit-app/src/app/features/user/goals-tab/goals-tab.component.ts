import { Component } from '@angular/core';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  standalone: true,
  selector: 'app-goals-tab',
  imports: [MaterialModule],
  templateUrl: './goals-tab.component.html',
  styleUrl: '../coming-soon-tab.css',
})
export class GoalsTabComponent {}
