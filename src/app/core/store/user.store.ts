import { Injectable } from '@angular/core';
import { signal, effect } from '@angular/core';
import { UserProfile } from '../models/user.model';
import { LocalStorageService } from '../../shared/services/local-storage.service';

@Injectable({
  providedIn: 'root'
})

export class UserStore {
  user = signal<UserProfile | null>(null);
  loading = signal<boolean>(false);

  private readonly storageKey = 'user_profile_v1';

  constructor(private ls: LocalStorageService) {
    // auto-sync to localStorage
    // avoid clearing localStorage on startup: only persist when there's a non-null user.
    effect(() => {
      const payload = this.user();
      if (payload !== null && payload !== undefined) {
        this.ls.set(this.storageKey, payload);
      }
    });
  }

  hydrateFromLocalStorage() {
    const fromLs = this.ls.get<UserProfile>(this.storageKey);
    if (fromLs) this.user.set(fromLs);
  }

  setUser(user: UserProfile | null) {
    this.user.set(user);
  }

  patchUser(patch: Partial<UserProfile>) {
    const current = this.user();
    const merged: UserProfile = {
      id:
        current?.id ??
        patch.id ??
        'local-' + Math.random().toString(36).slice(2, 9),
      email: patch.email ?? current?.email ?? '',
      fullName: patch.fullName ?? current?.fullName ?? '',
      heightCm: patch.heightCm ?? current?.heightCm ?? 0,
      weightKg: patch.weightKg ?? current?.weightKg ?? 0,
      age: patch.age ?? current?.age ?? 0,
      gender: patch.gender ?? current?.gender ?? 'other',
      activity: patch.activity ?? current?.activity ?? 'moderate',
      goal: patch.goal ?? current?.goal ?? 'maintain'
    };
    this.user.set(merged);
  }

  setLoading(flag: boolean) {
    this.loading.set(flag);
  }

  clear() {
    this.user.set(null);
    this.ls.remove(this.storageKey);
  }
}
