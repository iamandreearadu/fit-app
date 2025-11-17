import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthenticationStore } from '../store/auth.store';

/**
 * AuthenticationGuard is configurable via route.data.requiresAuth (default true).
 * - requiresAuth = true  => route requires an authenticated user; redirects to /login if not.
 * - requiresAuth = false => route must NOT have an authenticated user (e.g. login/register);
 *                           redirects to / if user is already authenticated.
 */
@Injectable({ providedIn: 'root' })
export class AuthenticationGuard implements CanActivate {
  constructor(private store: AuthenticationStore, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const requiresAuth = (route.data && route.data['allowed'] !== undefined)
      ? Boolean(route.data['allowed'])
      : true;
    const user = this.store.authUser();

    if (requiresAuth) {
      if (!user) {
        return this.router.parseUrl('/login');
      }
      return true;
    } else {
      // route should be accessible only when NOT authenticated
      if (user) {
        return this.router.parseUrl('/');
      }
      return true;
    }
  }
}
