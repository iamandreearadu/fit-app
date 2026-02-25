import { inject, Injectable } from '@angular/core';
import { AccountService } from '../../api/account.service';
import { AuthenticationStore } from '../store/auth.store';
import { AuthCredentials } from '../models/auth-credentials.model';
import { AuthenticationUser } from '../models/authentication-user.model';
import { AccountValidationService } from '../validations/account-validation.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { environment } from '../../../environments/environment';
import { UserFacade } from './user.facade';

@Injectable({ providedIn: 'root' })
export class AccountFacade {

  private authStore = inject(AuthenticationStore);
  private ls = inject(LocalStorageService);

  private svc = inject(AccountService);
  private validationSrv = inject(AccountValidationService);
  private userFacade = inject(UserFacade);

  private readonly authKey = environment.authKey;

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
    const fromLs = this.ls.get<AuthenticationUser>('auth_v1');
    if (fromLs) {
      this.authStore.setAuth(fromLs);
      await this.userFacade.loadCurrentUserFromFireStore(fromLs.id);
    }
  }


  // ========== Actions ==========

  public async login(creds: AuthCredentials): Promise<boolean> {
    this.authStore.setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const u = await this.svc.login(creds);

      this.authStore.setAuth(u);

      if (u) {
        this.ls.set(this.authKey, u);

        await this.userFacade.loadCurrentUserFromFireStore();
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const u = await this.svc.register(creds);

      this.authStore.setAuth(u);

      if (u) {
        this.ls.set(this.authKey, u);

        const newProfile = {
          fullName: creds.fullName || '',
          email: creds.email,
        };

        await this.userFacade.saveUserProfile(newProfile);
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

      this.authStore.clear();
      this.ls.remove(this.authKey);

    } finally {
      this.authStore.setLoading(false);
    }
  }
}
