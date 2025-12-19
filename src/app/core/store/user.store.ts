import { Injectable } from '@angular/core';
import { signal } from '@angular/core';
import { UserProfile } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserStore {

  private readonly _user = signal<UserProfile | null>(null);
  public loading = signal<boolean>(false);
  public user = this._user.asReadonly();

  constructor() {}

  public setUser(user: UserProfile | null) {
    this._user.set(user);
  }

  public setLoading(flag: boolean) {
    this.loading.set(flag);
  }

  public patchUser(patch: Partial<UserProfile>) {
    const current = this.user();
    const merged: UserProfile = {
      id: current?.id ?? patch.id ?? 'local-' + Math.random().toString(36).slice(2, 9),
      email: patch.email ?? current?.email ?? '',
      fullName: patch.fullName ?? current?.fullName ?? '',
      imageUrl: patch.imageUrl ?? current?.imageUrl ?? '',
      heightCm: patch.heightCm ?? current?.heightCm ?? 0,
      weightKg: patch.weightKg ?? current?.weightKg ?? 0,
      age: patch.age ?? current?.age ?? 0,
      gender: patch.gender ?? current?.gender ?? 'other',
      activity: patch.activity ?? current?.activity ?? 'moderate',
      goal: patch.goal ?? current?.goal ?? 'maintain'
    };

    this.setUser(merged);
  }

  public clear() {
    this._user.set(null);
  }
}
