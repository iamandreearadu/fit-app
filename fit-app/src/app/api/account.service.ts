import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthCredentials } from '../core/models/auth-credentials.model';
import { AuthenticationUser } from '../core/models/authentication-user.model';
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
  private readonly baseUrl = `${environment.apiUrl}/api/auth`;

  public async login(creds: AuthCredentials): Promise<AuthenticationUser> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.baseUrl}/login`, {
        email: creds.email,
        password: creds.password,
      })
    );
    return { id: res.id, email: res.email, fullName: res.fullName, token: res.token, isAdmin: res.isAdmin };
  }

  public async register(creds: AuthCredentials & { fullName?: string }): Promise<AuthenticationUser> {
    const body: Record<string, string> = {
      email:    creds.email,
      password: creds.password,
      fullName: creds.fullName ?? '',
    };
    // Fix 4: pass optional goal; backend defaults to "maintain" if omitted
    if (creds.goal) body['goal'] = creds.goal;

    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.baseUrl}/register`, body)
    );
    return { id: res.id, email: res.email, fullName: res.fullName, token: res.token, isAdmin: res.isAdmin };
  }

  public async requestPasswordReset(email: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password`, { email })
    );
    return response.message;
  }

  public async resetPassword(token: string, newPassword: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<{ message: string }>(`${this.baseUrl}/reset-password`, { token, newPassword })
    );
    return response.message;
  }

  /** Server-side logout placeholder — currently stateless JWT. */
  public async logout(): Promise<void> {
    // No-op: token expiry is handled client-side.
    // Extend here when a server-side token revocation endpoint is added.
  }
}
