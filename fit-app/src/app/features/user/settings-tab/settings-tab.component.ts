import { Component } from '@angular/core';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  standalone: true,
  selector: 'app-settings-tab',
  imports: [MaterialModule],
  templateUrl: './settings-tab.component.html',
  styleUrl: '../coming-soon-tab.css',
})
export class SettingsTabComponent {}
