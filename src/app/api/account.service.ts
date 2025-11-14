import { inject, Injectable } from '@angular/core';
import { LocalStorageService } from '../shared/services/local-storage.service';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthCredentials } from '../core/models/auth-credentials.model';
import { AuthenticationUser } from '../core/models/authentication-user.model';
import { AlertService } from '../shared/services/alert.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  // use environment configuration for keys and API base
  private readonly authKey = environment.authKey;
  private readonly apiBase = environment.apiBase;
  private readonly firebaseApiKey = environment.firebaseApiKey;
  private readonly firebaseAuthBase = environment.firebaseAuthBase;

  private router = inject(Router);

  constructor(private ls: LocalStorageService, private http: HttpClient, private alerts: AlertService) {}

  // helper to build firebase auth endpoints (if you set firebaseApiKey in environment)
  private firebaseSignInUrl(): string {
    return `${this.firebaseAuthBase}/accounts:signInWithPassword?key=${this.firebaseApiKey}`;
  }

  private firebaseSignUpUrl(): string {
    return `${this.firebaseAuthBase}/accounts:signUp?key=${this.firebaseApiKey}`;
  }

  async login(creds: AuthCredentials): Promise<AuthenticationUser | null> {
    try {
      // if a Firebase API key is configured, use Firebase REST endpoints
      if (this.firebaseApiKey) {
        const payload = { email: creds.email, password: creds.password, returnSecureToken: true };
        const res = await firstValueFrom(this.http.post<any>(this.firebaseSignInUrl(), payload));
        const user: AuthenticationUser = {
          id: res.localId ?? 'firebase-' + Date.now(),
          email: res.email ?? creds.email,
          token: res.idToken ?? res.token
        };
        this.ls.set(this.authKey, user);
        this.alerts.success('You have been logged in successfully', 'Welcome');
        return user;
      }

      // fallback to configured apiBase (e.g., reqres)
      const res = await firstValueFrom(this.http.post<{ token: string }>(`${this.apiBase}/login`, creds));
      const user: AuthenticationUser = {
        id: 'remote-' + Date.now(),
        email: creds.email,
        token: res.token
      };
      this.ls.set(this.authKey, user);
      this.alerts.success('You have been logged in successfully', 'Welcome');
      return user;
    } catch (e) {
      // Remote auth unreachable: first try to find a local cached auth for this email
      this.alerts.warn('Remote auth unreachable — attempting local cache', 'Offline');
      const cached = this.ls.get<AuthenticationUser>(this.authKey);
      if (cached && cached.email === creds.email) {
        // found a cached user matching the email — sign in locally
        this.alerts.info('Signed in from local cache', 'Offline login');
        // ensure store uses the same key/value
        this.ls.set(this.authKey, cached);

        this.router.navigate(['/']);

        return cached;
      }
      else
        return null;
    }
  }

  // Register using free API (reqres). Returns AuthenticationUser.
  async register(creds: AuthCredentials & { fullName?: string }): Promise<AuthenticationUser> {
    try {
      if (this.firebaseApiKey) {
        const payload = { email: creds.email, password: creds.password, returnSecureToken: true };
        const res = await firstValueFrom(this.http.post<any>(this.firebaseSignUpUrl(), payload));
        const user: AuthenticationUser = {
          id: res.localId ?? String(res.id ?? 'firebase-' + Date.now()),
          email: res.email ?? creds.email,
          fullName: creds.fullName,
          token: res.idToken ?? res.token
        };
        this.ls.set(this.authKey, user);
        this.alerts.success('Account created and logged in', 'Welcome');
        return user;
      }

      const res = await firstValueFrom(this.http.post<{ id: number; token: string }>(`${this.apiBase}/register`, { email: creds.email, password: creds.password }));
      const user: AuthenticationUser = {
        id: String(res.id),
        email: creds.email,
        fullName: creds.fullName,
        token: res.token
      };
      this.ls.set(this.authKey, user);
      this.alerts.success('Account created and logged in', 'Welcome');
      return user;
    } catch (e) {
      this.alerts.warn('Could not reach remote register service, created local account', 'Register fallback');
      // return null; // uncomment this line to disable fallback register

      // fallback local user
      const fallback: AuthenticationUser = {
        id: 'local-' + Math.random().toString(36).slice(2, 9),
        email: creds.email,
        fullName: creds.fullName,
        token: 'local-token-' + Math.random().toString(36).slice(2, 9)
      };
      this.ls.set(this.authKey, fallback);

      this.router.navigate(['/']);

      return fallback;
      // ---------------------------------------------------------
    }
  }

  logout() {
    this.ls.remove(this.authKey);
    this.alerts.info('You have been logged out');
  }
}
