import { Injectable } from '@angular/core';
import { AccountService } from '../../api/account.service';
import { AuthenticationStore } from '../store/auth.store';
import { AuthCredentials } from '../models/auth-credentials.model';
import { AuthenticationUser } from '../models/authentication-user.model';
import { AccountValidationService } from '../validations/account-validation.service';

@Injectable({ providedIn: 'root' })
export class AccountFacade {
  constructor(private svc: AccountService, private store: AuthenticationStore, private validation: AccountValidationService) {}

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
      return u;
    } finally {
      this.store.setLoading(false);
    }
  }

  async register(creds: AuthCredentials & { fullName?: string }): Promise<AuthenticationUser> {
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
  }

  hydrateFromLocalStorage() {
    this.store.hydrateFromLocalStorage();
  }

  // expose validation helpers so components use the facade for validation logic
  getValidators() {
    return this.validation;
  }
}
