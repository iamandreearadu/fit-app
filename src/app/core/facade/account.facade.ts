import { inject, Injectable } from '@angular/core';
import { AccountService } from '../../api/account.service';
import { AuthenticationStore } from '../store/auth.store';
import { AuthCredentials } from '../models/auth-credentials.model';
import { AuthenticationUser } from '../models/authentication-user.model';
import { AccountValidationService } from '../validations/account-validation.service';
import { UserService } from '../../api/user.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';

@Injectable({ providedIn: 'root' })
export class AccountFacade {

  private store = inject(AuthenticationStore);
  private ls = inject(LocalStorageService);


  private svc = inject(AccountService);
  private validation = inject(AccountValidationService);
  private userService = inject(UserService);

  private readonly storageKey = 'auth_v1';

  constructor() {}

  public init(): void {
    const fromLs = this.ls.get<AuthenticationUser>(this.storageKey);
    if (fromLs) this.store.setAuth(fromLs);
  }

  get loading() {
    return this.store.loading;
  }

  get authUser() {
    return this.store.authUser;
  }

  async login(creds: AuthCredentials): Promise<AuthenticationUser | null> {
    this.store.setLoading(true);

    try {
      const u = await this.svc.login(creds);
      this.store.setAuth(u);

      if(u) {
      // wait for user profile to be loaded and propagated to UserStore
      await this.userService.getCurrentUserProfile();
      }

      return u;
    } finally {
      this.store.setLoading(false);
    }
  }

  async register(creds: AuthCredentials & { fullName?: string }): Promise<AuthenticationUser | null> {
    this.store.setLoading(true);
    try {
      const u = await this.svc.register(creds);
      this.store.setAuth(u);
      return u;
    } finally {
      this.store.setLoading(false);
    }
  }

  logout() {
    this.svc.logout();
    this.store.clear();
   // this.userStore.clear();
  }

  // expose validation helpers so components use the facade for validation logic
  getValidators() {
    return this.validation;
  }
}
