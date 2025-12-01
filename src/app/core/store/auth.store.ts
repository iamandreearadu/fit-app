import { Injectable } from '@angular/core';
import { signal } from '@angular/core';
import { AuthenticationUser } from '../models/authentication-user.model';
@Injectable({ providedIn: 'root' })
export class AuthenticationStore {

  private readonly _authUser = signal<AuthenticationUser | null>(null);

  public authUser = this._authUser.asReadonly();
  public loading = signal<boolean>(false);

  constructor() { }

  public setAuth(user: AuthenticationUser | null) {
    this._authUser.set(user);
  }

  public setLoading(flag: boolean) {
    this.loading.set(flag);
  }

  public clear() {
    this._authUser.set(null);
  }
}
