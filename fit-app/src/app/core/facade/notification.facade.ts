import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../api/notification.service';
import { NotificationHubService } from '../services/notification-hub.service';
import { SocialNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationFacade {
  private readonly notifSvc = inject(NotificationService);
  private readonly notifHub = inject(NotificationHubService);

  notifications = signal<SocialNotification[]>([]);
  unreadCount = signal(0);
  isLoading = signal(false);
  error = signal<string | null>(null);
  hasMore = signal(true);
  private page = 1;

  constructor() {
    this.notifHub.notification$.pipe(takeUntilDestroyed()).subscribe(n => {
      // Chat messages are handled exclusively in Chat — exclude from notifications feed
      if (n.type === 'message') return;
      this.notifications.update(ns => [n, ...ns]);
      this.unreadCount.update(c => c + 1);
    });
  }

  async connectHub(token: string): Promise<void> {
    try {
      await this.notifHub.connect(token);
    } catch {
      // silently ignore hub connection errors
    }
  }

  async loadUnreadCount(): Promise<void> {
    try {
      const res = await firstValueFrom(this.notifSvc.getUnreadCount());
      this.unreadCount.set(res.count);
    } catch {
      // silently ignore
    }
  }

  async loadNotifications(reset = false): Promise<void> {
    if (reset) {
      this.page = 1;
      this.notifications.set([]);
      this.hasMore.set(true);
      this.error.set(null);
    }
    if (!this.hasMore()) return;
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(this.notifSvc.getNotifications(this.page));
      this.notifications.update(ns => [...ns, ...res.items]);
      this.hasMore.set(res.hasMore);
      this.page++;
    } catch {
      this.error.set('Failed to load notifications.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async markAllRead(): Promise<void> {
    try {
      await firstValueFrom(this.notifSvc.markAllRead());
      this.notifications.update(ns => ns.map(n => ({ ...n, isRead: true })));
      this.unreadCount.set(0);
    } catch {
      // silently ignore
    }
  }

  async markOneRead(id: number): Promise<void> {
    const notif = this.notifications().find(n => n.id === id);
    if (!notif || notif.isRead) return;
    try {
      await firstValueFrom(this.notifSvc.markOneRead(id));
      this.notifications.update(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
      this.unreadCount.update(c => Math.max(0, c - 1));
    } catch {
      // silently ignore
    }
  }
}
