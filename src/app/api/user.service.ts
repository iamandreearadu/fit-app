import { inject, Injectable } from "@angular/core";
import { collection, doc, Firestore, getDoc, getDocs, serverTimestamp, setDoc } from "@angular/fire/firestore";
import { Auth, User } from "@angular/fire/auth";
import { AlertService } from "../shared/services/alert.service";
import { UserFirestore } from "../core/models/user-firestore.model";
import { DailyUserData } from "../core/models/daily-user-data.model";
import { UserFitMetrics } from "../core/models/user-fit-metrics.model";
import { UserProfile } from "../core/models/user.model";

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private firestore = inject(Firestore);
  private alerts = inject(AlertService);
  private auth = inject(Auth);


  constructor() {}

  private getAuthUser(): User | null {
    return this.auth.currentUser as User | null;
  }

  public async getCurrentUser(): Promise<UserFirestore | null> {
    const fbUser = this.auth.currentUser;
    if (!fbUser) return null;

    return this.getUserById(fbUser.uid);
  }


  // === User Profile ===

  public async getUserById(uid: string): Promise<UserFirestore | null> {
    try {
      const ref = doc(this.firestore, `users/${uid}`);
      const snap = await getDoc(ref);

      if (!snap.exists()) return null;

      const d = snap.data() as any;

      const userFs: UserFirestore = {
        id: uid,
        age: d.age ?? null,
        email: d.email ?? null,
        fullName: d.fullName ?? null,
        imageUrl: d.imageUrl ?? null,
        gender: d.gender ?? null,
        goal: d.goal ?? null,
        activity: d.activity ?? null,
        heightCm: d.heightCm ?? null,
        weightKg: d.weightKg ?? null,
        metrics: d.metrics ?? null,
        metricsUpdatedAt: d.metricsUpdatedAt ?? null,
        updatedAt: d.updatedAt ?? null,
      };

      return userFs;

    } catch (err) {
      this.alerts.warn('Firestore getCurrentUser failed', String(err));
      return null;
    }
  }

  public async saveUserProfile(profile: UserProfile, metrics: UserFitMetrics | null ): Promise<void> {
    try {
      const fbUser = this.getAuthUser();
      if (!fbUser) return;

      const ref = doc(this.firestore, `users/${fbUser.uid}`);

      const payload: any = {
          age: profile.age,
          email: profile.email,
          fullName: profile.fullName,
          imageUrl: profile.imageUrl,
          gender: profile.gender,
          goal: profile.goal,
          activity: profile.activity,
          heightCm: profile.heightCm,
          weightKg: profile.weightKg,
          updatedAt: serverTimestamp(),
      };

      if (metrics) {
        payload.metrics = metrics;
        payload.metricsUpdatedAt = serverTimestamp();
      }

      await setDoc(ref, payload, { merge: true });

      this.alerts.success('Profile saved');

    } catch (err) {
      this.alerts.warn('Failed to save profile', String(err));
    }
  }



  // === Daily User Data ===

  public async getDailyForDate(dateIso: string): Promise<DailyUserData | null> {
    try {
      const fbUser = this.getAuthUser();
      if (!fbUser) return null;

      const ref = doc(this.firestore, `users/${fbUser.uid}/daily/${dateIso}`);
      const snap = await getDoc(ref);

      if (!snap.exists()) return null;

      const d = snap.data() as any;

      const daily: DailyUserData = {
        date: d.dateIso,
        activityType: d.activityType ?? 'Rest Day',
        caloriesBurned: d.caloriesBurned ?? 0,
        caloriesIntake: d.caloriesIntake ?? 0,
        caloriesTotal: d.caloriesTotal ?? 0,
        waterConsumedL: d.waterConsumedL ?? 0,
        steps: d.steps ?? 0,
        stepTarget: d.stepTarget ?? 3000,
        macrosPct: {
          protein: d.macrosPct?.protein ?? 0,
          carbs: d.macrosPct?.carbs ?? 0,
          fats: d.macrosPct?.fats ?? 0,
        },
      };

      return daily;
    } catch (err) {
      this.alerts.warn('Firestore getDailyForDate failed', String(err));
      return null;
    }
  }

  public async saveDailyForDate(dateIso: string, data: DailyUserData): Promise<void> {
    try {
      const fbUser = this.getAuthUser();
      if (!fbUser) return;

      const ref = doc(this.firestore, `users/${fbUser.uid}/daily/${dateIso}`);

      await setDoc(
        ref,
        {
          ...data,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // this.alerts.success('Daily data saved');
    } catch (err) {
      this.alerts.warn('Failed to save daily data', String(err));
    }
  }


  public async getAllPreviousData(): Promise<DailyUserData[]> {
    try {
      const fbUser = this.getAuthUser();
      if (!fbUser) return [];

      const ref = collection(this.firestore, `users/${fbUser.uid}/daily`);
      const snap = await getDocs(ref);

      const items: DailyUserData[] = [];

      snap.forEach(d => {
        const data = d.data() as any;

        items.push({
          date: data.date,
          activityType: data.activityType ?? 'Rest Day',
          caloriesBurned: data.caloriesBurned ?? 0,
          caloriesIntake: data.caloriesIntake ?? 0,
          caloriesTotal: data.caloriesTotal ?? 0,
          waterConsumedL: data.waterConsumedL ?? 0,
          steps: data.steps ?? 0,
          stepTarget: data.stepTarget ?? 3000,
          macrosPct: data.macrosPct ?? { protein: 0, carbs: 0, fats: 0 },
        });
      });

      const todayIso = new Date().toISOString().slice(0, 10);
      const filtered = items.filter(i => i.date !== todayIso);

      return filtered.sort((a,b) => b.date.localeCompare(a.date));

    } catch (err) {
      this.alerts.warn("Failed to load daily history", String(err));
      return [];
    }

  }
}
