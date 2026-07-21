import { HttpInterceptorFn } from '@angular/common/http';
import { inject, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Ensures HTTP response callbacks run inside Angular's NgZone.
 *
 * In test environments (e.g. Cypress), the XHR request interception
 * layer can replace XMLHttpRequest *after* zone.js patches it, causing
 * response callbacks to fire outside the Angular zone.  When that
 * happens, signal updates don't schedule a change-detection run, so
 * templates never re-render.
 *
 * Wrapping every emission in ngZone.run() guarantees that downstream
 * subscribers (facades using firstValueFrom / await) receive the value
 * inside the zone, which allows zone.js to schedule CD normally.
 *
 * In production this is effectively a no-op: ngZone.run() detects that
 * the caller is already inside the zone and executes the callback
 * synchronously without any additional overhead.
 */
export const zoneFixInterceptor: HttpInterceptorFn = (req, next) => {
  const ngZone = inject(NgZone);

  return new Observable(observer => {
    const sub = next(req).subscribe({
      next:     value => ngZone.run(() => observer.next(value)),
      error:    error => ngZone.run(() => observer.error(error)),
      complete: ()    => ngZone.run(() => observer.complete()),
    });
    return () => sub.unsubscribe();
  });
};
