import { inject, Injectable, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})

export class NavigationService {
  private _currentRoute = signal<string>('/');
  public currentRoute = this._currentRoute.asReadonly();
  private router= inject(Router) 

  constructor() {
    // Track route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this._currentRoute.set(event.urlAfterRedirects);
      });

    // Set initial route
    this._currentRoute.set(this.router.url);
  }

  isActive(route: string): boolean {
    return this._currentRoute() === route;
  }
}
