import { Routes } from '@angular/router';

export const SOCIAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./social-shell.component').then(m => m.SocialShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./feed/social-feed.component').then(m => m.SocialFeedComponent),
      },
      {
        path: 'discover',
        loadComponent: () =>
          import('./discover/social-discover.component').then(m => m.SocialDiscoverComponent),
      },
      {
        path: 'post/:id',
        loadComponent: () =>
          import('./post-detail/social-post-detail.component').then(m => m.SocialPostDetailComponent),
      },
      {
        path: 'article/:id',
        loadComponent: () =>
          import('./article-detail/article-detail.component').then(m => m.ArticleDetailComponent),
      },
      {
        path: 'profile/:userId',
        loadComponent: () =>
          import('./social-profile/social-profile.component').then(m => m.SocialProfileComponent),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./chat/social-chat.component').then(m => m.SocialChatComponent),
      },
      {
        path: 'chat/:id',
        loadComponent: () =>
          import('./chat-detail/social-chat-detail.component').then(m => m.SocialChatDetailComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./notifications/social-notifications.component').then(m => m.SocialNotificationsComponent),
      },
    ],
  },
];
