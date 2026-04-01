import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthCredentials } from '../core/models/auth-credentials.model';
import { AuthenticationUser } from '../core/models/authentication-user.model';
import { AlertService } from '../shared/services/alert.service';
import { environment } from '../../environments/environment';

interface AuthResponse {
  id: string;
  email: string;
  fullName: string;
  token: string;
  isAdmin: boolean;
}

@Injectable({ providedIn: 'root' })
export class AccountService {

  private http = inject(HttpClient);
  private alerts = inject(AlertService);
  private readonly baseUrl = `${environment.apiUrl}/api/auth`;

  public async login(creds: AuthCredentials): Promise<AuthenticationUser | null> {
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.baseUrl}/login`, {
          email: creds.email,
          password: creds.password,
        })
      );

      this.alerts.success('You have been logged in successfully', 'Welcome');
      return { id: res.id, email: res.email, fullName: res.fullName, token: res.token, isAdmin: res.isAdmin };

    } catch (error: any) {
      const status = error?.status;
      if (status === 401 || status === 400) {
        this.alerts.warn('Incorrect email or password', 'Login failed');
      } else if (status === 0) {
        this.alerts.warn('Connection failed', 'Error');
      } else {
        this.alerts.warn("User couldn't be logged in", 'Error');
      }
      return null;
    }
  }

  public async register(creds: AuthCredentials & { fullName?: string }): Promise<AuthenticationUser | null> {
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.baseUrl}/register`, {
          email: creds.email,
          password: creds.password,
          fullName: creds.fullName ?? '',
        })
      );

      this.alerts.success('Account created and logged in', 'Welcome');
      return { id: res.id, email: res.email, fullName: res.fullName, token: res.token, isAdmin: res.isAdmin };

    } catch (err: any) {
      const status = err?.status;
      if (status === 409) {
        this.alerts.warn('Email address is already used', 'Error');
      } else {
        this.alerts.warn('Could not reach remote register service', 'Error');
      }
      return null;
    }
  }

  public async logout(): Promise<void> {
    this.alerts.info('You have been logged out');
  }
}