import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { UserProfile } from '../models/user.model';

@Injectable({ 
  providedIn: 'root'
 })

export class AccountService {
  private readonly storageKey = 'user_profile_v1';
  constructor(private ls: LocalStorageService) {}

  async getCurrentUser(): Promise<UserProfile | null> {
    // In real app you'd do: return this.http.get<UserProfile>('/api/me').toPromise();
    return this.ls.get<UserProfile>(this.storageKey);
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    // Real HTTP example (commented):
    // return this.http.patch<UserProfile>('/api/me', patch).toPromise();

    const existing = this.ls.get<UserProfile>(this.storageKey);

    const updated: UserProfile = {
      id: existing?.id ?? patch.id ?? 'local-' + Math.random().toString(36).slice(2, 9),
      email: patch.email ?? existing?.email ?? '',
      fullName: patch.fullName ?? existing?.fullName ?? '',
      heightCm: patch.heightCm ?? existing?.heightCm ?? 0,
      weightKg: patch.weightKg ?? existing?.weightKg ?? 0,
      age: patch.age ?? existing?.age ?? 0,
      gender: patch.gender ?? existing?.gender ?? 'other',
      activity: patch.activity ?? existing?.activity ?? 'moderate',
      goal: patch.goal ?? existing?.goal ?? 'maintain',
    };

    this.ls.set(this.storageKey, updated);
    return updated;
  }
}
