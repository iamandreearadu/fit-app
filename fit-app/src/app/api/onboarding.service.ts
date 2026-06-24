import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  BiometricsRequest,
  OnboardingStatusResponse,
  RecordStepRequest,
  YourNumbersResponse,
} from '../core/models/onboarding.model';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/onboarding`;
  private readonly usersUrl = `${environment.apiUrl}/api/users`;

  submitBiometrics(req: BiometricsRequest): Observable<YourNumbersResponse> {
    return this.http.post<YourNumbersResponse>(`${this.baseUrl}/biometrics`, req);
  }

  recordStep(req: RecordStepRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/step`, req);
  }

  getStatus(): Observable<OnboardingStatusResponse> {
    return this.http.get<OnboardingStatusResponse>(`${this.baseUrl}/status`);
  }

  getYourNumbers(): Observable<YourNumbersResponse> {
    return this.http.get<YourNumbersResponse>(`${this.usersUrl}/me/numbers`);
  }
}
