import { inject, Injectable } from "@angular/core";
import { UserProfile } from "../core/models/user.model";
import { LocalStorageService } from "../shared/services/local-storage.service";
import { doc, Firestore, getDoc, serverTimestamp, setDoc } from "@angular/fire/firestore";
import { Auth, User } from "@angular/fire/auth";
import { AlertService } from "../shared/services/alert.service";
import { UserMetricsService } from "../core/services/user-metrics.service";
import { UserStore } from "../core/store/user.store";

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly storageKey = 'user_profile_v1';

  private ls = inject(LocalStorageService);
  private firestore = inject(Firestore);
  private alerts = inject(AlertService);
  private userStore = inject(UserStore);
  private metricsSvc = inject(UserMetricsService);
  private auth = inject<Auth>(Auth);

  constructor() {}

  async getCurrentUser(): Promise<UserProfile | null> {
    try{
  const user = this.auth.currentUser as User | null;

      if(user){
        const ref = doc(this.firestore, `users/${user.uid}`);
        const snap =  await getDoc(ref);;
        if(snap.exists()){
          const d = snap.data() as any;
          return {
            id: user.uid,
            email: d.email ?? user.email ?? '',
            fullName: d.fullName ?? d.displayName ?? '',
            heightCm: d.heightCm ?? 0,
            weightKg: d.weightKg ?? 0,
            age: d.age ?? 0,
            gender: d.gender  ?? 'other',
            activity: d.activity ?? 'moderate',
            goal: d.goal ?? 'maintain',
          } as UserProfile;
        }
      }
    } catch(err){
      this.alerts.warn('Firestore getCurrentUser failed, falling back to LocalStorage', err as string);
    }
    return this.ls.get<UserProfile>(this.storageKey) ?? null;
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

    try{
  const user = this.auth.currentUser as User | null;
      if(user){
        const ref = doc(this.firestore, `users/${user.uid}`);
        await setDoc(ref,{
          email: updated.email,
          fullName: updated.fullName,
          heightCm: updated.heightCm,
          weightKg: updated.weightKg,
          age: updated.age,
          gender: updated.gender,
          activity: updated.activity,
          goal: updated.goal,
          updatedAt: serverTimestamp()
        }, { merge: true });



        this.getMetrics(updated,ref);
      }
    } catch(err){
        this.alerts.warn('Failed to update profile in Firestore, saved locally', err as string);
    }

    this.ls.set(this.storageKey, updated);
    return updated;
  }

  // load profile from firestore after login
 async getCurrentUserProfile(): Promise<UserProfile | null> {
   try{
        const profile = await this.getCurrentUser();
        this.userStore.setUser(profile);
    } catch(err){
        console.error('Failed to fetch user profile after login', err);
        this.alerts.warn('Failed to fetch user profile after login', err as string);

      }
      return null;  
  }

  async getMetrics (user:UserProfile, ref:any){  
        try {
          const metrics = this.metricsSvc.compute(user);
          await setDoc(ref, {
            metrics,
            metricsUpdatedAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          console.warn('Failed to persist computed metrics', err);
          this.alerts.warn('Failed to persist computed metrics', err as string);

        }
  }

}
