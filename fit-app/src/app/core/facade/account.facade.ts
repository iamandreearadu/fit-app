import { inject, Injectable } from '@angular/core';
import { AccountService } from '../../api/account.service';
import { AuthenticationStore } from '../store/auth.store';
import { AuthCredentials } from '../models/auth-credentials.model';
import { AuthenticationUser } from '../models/authentication-user.model';
import { AccountValidationService } from '../validations/account-validation.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { AlertService } from '../../shared/services/alert.service';
import { environment } from '../../../environments/environment';
import { UserFacade } from './user.facade';
import { ChatHubService } from '../services/chat-hub.service';
import { NotificationHubService } from '../services/notification-hub.service';
import { NotificationFacade } from './notification.facade';
import { OnboardingFacade } from './onboarding.facade';

@Injectable({ providedIn: 'root' })
export class AccountFacade {

  private authStore = inject(AuthenticationStore);
  private ls = inject(LocalStorageService);
  private alerts = inject(AlertService);

  private svc = inject(AccountService);
  private validationSrv = inject(AccountValidationService);
  private userFacade = inject(UserFacade);
  private chatHub = inject(ChatHubService);
  private notifHub = inject(NotificationHubService);
  private notifFacade = inject(NotificationFacade);
  private onboardingFacade = inject(OnboardingFacade);

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

      // Start hub connections in parallel with user data loading
      if (fromLs.token) {
        void this.chatHub.connect(fromLs.token);
        void this.notifHub.connect(fromLs.token);
        void this.notifFacade.loadUnreadCount();
      }

      await this.userFacade.loadCurrentUser();
      void this.userFacade.loadStreak();
    }
  }


  // ========== Actions ==========

  public async login(creds: AuthCredentials): Promise<boolean> {
    this.authStore.setLoading(true);

    try {
      const u = await this.svc.login(creds);

      this.authStore.setAuth(u);
      this.ls.set(this.authKey, u);

      await this.userFacade.loadCurrentUser();
      void this.userFacade.loadStreak();

      // Connect real-time hubs
      if (u.token) {
        void this.chatHub.connect(u.token);
        void this.notifHub.connect(u.token);
        void this.notifFacade.loadUnreadCount();
      }

      this.alerts.success('You have been logged in successfully', 'Welcome');
      return true;

    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 400) {
        this.alerts.warn('Incorrect email or password', 'Login failed');
      } else if (status === 0) {
        this.alerts.warn('Connection failed', 'Error');
      } else {
        this.alerts.warn("User couldn't be logged in", 'Error');
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
      this.ls.set(this.authKey, u);

      await this.userFacade.loadCurrentUser();
      void this.userFacade.loadStreak();

      // Connect real-time hubs
      if (u.token) {
        void this.chatHub.connect(u.token);
        void this.notifHub.connect(u.token);
        void this.notifFacade.loadUnreadCount();
      }

      this.alerts.success('Account created and logged in', 'Welcome');
      return true;

    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        this.alerts.warn('Email address is already used', 'Error');
      } else {
        this.alerts.warn('Could not reach remote register service', 'Error');
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
      this.userFacade.streak.set(null);   // Fix 5 — clear stale streak on logout
      this.onboardingFacade.resetStatus(); // Fix 4 — reset cached onboarding state
      this.ls.remove(this.authKey);
      this.ls.remove(this.userKey);

      this.alerts.info('You have been logged out');

    } finally {
      this.authStore.setLoading(false);
    }
  }
}
