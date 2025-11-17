import { Injectable } from '@angular/core';
import { signal, effect } from '@angular/core';
import { AuthenticationUser } from '../models/authentication-user.model';
import { LocalStorageService } from '../../shared/services/local-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthenticationStore {
  authUser = signal<AuthenticationUser | null>(null);
  loading = signal<boolean>(false);

  private readonly storageKey = 'auth_v1';

  constructor(private ls: LocalStorageService) {
    // persist auth user to localStorage when present
    effect(() => {
      const u = this.authUser();
      if (u !== null && u !== undefined) {
        this.ls.set(this.storageKey, u);
      }
    });
  }

  hydrateFromLocalStorage() {
    const fromLs = this.ls.get<AuthenticationUser>(this.storageKey);
    if (fromLs) this.authUser.set(fromLs);
  }

  setAuth(user: AuthenticationUser | null) {
    this.authUser.set(user);
  }

  setLoading(flag: boolean) {
    this.loading.set(flag);
  }

  clear() {
    this.authUser.set(null);
    this.ls.remove(this.storageKey);
  }
}
