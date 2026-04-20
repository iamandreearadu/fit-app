import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationFacade } from '../../../core/facade/notification.facade';
import { SocialNotification } from '../../../core/models/notification.model';

@Component({
  selector: 'app-social-notifications',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './social-notifications.component.html',
  styleUrl: './social-notifications.component.css'
})
export class SocialNotificationsComponent implements OnInit {
  protected readonly facade = inject(NotificationFacade);
  private readonly router = inject(Router);

  readonly skeletons = Array.from({ length: 5 });

  ngOnInit(): void {
    this.facade.loadNotifications(true);
  }

  onNotificationClick(n: SocialNotification): void {
    if (!n.isRead) {
      this.facade.markOneRead(n.id);
    }
    switch (n.type) {
      case 'like':
      case 'comment':
        if (n.referenceId) this.router.navigate(['/social/post', n.referenceId]);
        break;
      case 'follow':
        this.router.navigate(['/social/profile', n.actor.id]);
        break;
    }
  }

  getTypeIcon(type: SocialNotification['type']): string {
    switch (type) {
      case 'like': return 'favorite';
      case 'comment': return 'chat_bubble';
      case 'follow': return 'person_add';
      case 'message': return 'mail';
    }
  }

  getTypeIconClass(type: SocialNotification['type']): string {
    switch (type) {
      case 'like': return 'icon-like';
      case 'comment': return 'icon-comment';
      case 'follow': return 'icon-follow';
      case 'message': return 'icon-message';
    }
  }
}
