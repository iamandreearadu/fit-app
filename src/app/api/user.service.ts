import { Injectable } from "@angular/core";
import { UserProfile } from "../core/models/user.model";
import { LocalStorageService } from "../shared/services/local-storage.service";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly storageKey = 'user_profile_v1';

  constructor(private ls: LocalStorageService) {}

  async getCurrentUser(): Promise<UserProfile | null> {
    return this.ls.get<UserProfile>(this.storageKey);
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
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
