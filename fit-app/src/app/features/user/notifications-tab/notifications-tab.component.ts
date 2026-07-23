import { Component } from '@angular/core';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  standalone: true,
  selector: 'app-notifications-tab',
  imports: [MaterialModule],
  templateUrl: './notifications-tab.component.html',
  styleUrl: '../coming-soon-tab.css',
})
export class NotificationsTabComponent {}
