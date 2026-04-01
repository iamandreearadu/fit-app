import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthenticationStore } from '../store/auth.store';

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {

  constructor(
    private store: AuthenticationStore,
    private router: Router
  ) {}

  canActivate(): boolean | UrlTree {
    const user = this.store.authUser();

    if (user) {
      return this.router.createUrlTree(['/']);
    }

    return true;
  }
}
