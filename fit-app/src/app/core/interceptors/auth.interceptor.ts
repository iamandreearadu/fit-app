import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthenticationStore } from '../store/auth.store';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthenticationStore);
  const ls = inject(LocalStorageService);
  const router = inject(Router);
  const token = authStore.authUser()?.token;

  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthEndpoint = req.url.includes('/api/auth/');
      if (err.status === 401 && token && !isAuthEndpoint) {
        authStore.clear();
        ls.remove(environment.authKey);
        ls.remove(environment.userKey);
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
