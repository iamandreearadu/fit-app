import { inject, Injectable } from '@angular/core';
import { AccountService } from '../../api/account.service';
import { AuthenticationStore } from '../store/auth.store';
import { AuthCredentials } from '../models/auth-credentials.model';
import { AuthenticationUser } from '../models/authentication-user.model';
import { AccountValidationService } from '../validations/account-validation.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { environment } from '../../../environments/environment';
import { UserFacade } from './user.facade';
import { ChatHubService } from '../services/chat-hub.service';
import { NotificationHubService } from '../services/notification-hub.service';
import { NotificationFacade } from './notification.facade';

@Injectable({ providedIn: 'root' })
export class AccountFacade {

  private authStore = inject(AuthenticationStore);
  private ls = inject(LocalStorageService);

  private svc = inject(AccountService);
  private validationSrv = inject(AccountValidationService);
  private userFacade = inject(UserFacade);
  private chatHub = inject(ChatHubService);
  private notifHub = inject(NotificationHubService);
  private notifFacade = inject(NotificationFacade);

  private readonly authKey = environment.authKey;
  private readonly userKey = environment.userKey;


  // ========== Getters ==========

  get loading() {
    return this.authStore.loading;
  }

  get authUser() {
    return this.authStore.authUser;
  }

  get authValidation() {
    return this.validationSrv;
  }


  // ========== Initialization ==========

  constructor() {}

  public async init(): Promise<void> {
    const fromLs = this.ls.get<AuthenticationUser>(this.authKey);
    if (fromLs) {
      this.authStore.setAuth(fromLs);
      await this.userFacade.loadCurrentUser();

      // Connect hubs if token available
      if (fromLs.token) {
        void this.chatHub.connect(fromLs.token);
        void this.notifHub.connect(fromLs.token);
        void this.notifFacade.loadUnreadCount();
      }
    }
  }


  // ========== Actions ==========

  public async login(creds: AuthCredentials): Promise<boolean> {
    this.authStore.setLoading(true);

    try {
      const u = await this.svc.login(creds);

      this.authStore.setAuth(u);

      if (u) {
        this.ls.set(this.authKey, u);

        await this.userFacade.loadCurrentUser();

        // Connect real-time hubs
        if (u.token) {
          void this.chatHub.connect(u.token);
          void this.notifHub.connect(u.token);
          void this.notifFacade.loadUnreadCount();
        }

        return true;
      }

      return false;
    } finally {
      this.authStore.setLoading(false);
    }
  }

  public async register(creds: AuthCredentials & { fullName?: string }): Promise<boolean> {
    this.authStore.setLoading(true);

    try {
      const u = await this.svc.register(creds);

      this.authStore.setAuth(u);

      if (u) {
        this.ls.set(this.authKey, u);

        await this.userFacade.loadCurrentUser();

        // Connect real-time hubs
        if (u.token) {
          void this.chatHub.connect(u.token);
          void this.notifHub.connect(u.token);
          void this.notifFacade.loadUnreadCount();
        }

        return true;
      }

      return false;
    } finally {
      this.authStore.setLoading(false);
    }
  }

  public async logout(): Promise<void> {
    this.authStore.setLoading(true);

    try {
      await this.svc.logout();

      // Disconnect real-time hubs
      void this.chatHub.disconnect();
      void this.notifHub.disconnect();

      this.authStore.clear();
      this.ls.remove(this.authKey);
      this.ls.remove(this.userKey);

    } finally {
      this.authStore.setLoading(false);
    }
  }
}
