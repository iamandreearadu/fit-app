import { inject, Injectable } from "@angular/core";
import { DailyUserData } from "../models/daily-user-data.model";
import { LocalStorageService } from "../../shared/services/local-storage.service";
import { Firestore } from '@angular/fire/firestore';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Auth } from '@angular/fire/auth';
import { AlertService } from '../../shared/services/alert.service';

@Injectable({
    providedIn: 'root'
})

export class DailyUserDataService {
    // today's ISO date (YYYY-MM-DD)
   todayDate = new Date().toISOString().slice(0, 10);


    // today's local date in YYYY-MM-DD (use local date to avoid timezone shifts)
    // todayDate = (() => {
    //     const d = new Date();
    //     const y = d.getFullYear();
    //     const m = String(d.getMonth() + 1).padStart(2, '0');
    //     const day = String(d.getDate()).padStart(2, '0');
    //     return `${y}-${m}-${day}`;
    // })();

    private ls = inject(LocalStorageService);
    private firestore = inject(Firestore);
    private alerts = inject(AlertService);
    private auth = inject<Auth>(Auth);

    caloriesFromMacros(protein:number,carbs:number,fats:number): number{
        return (protein*4)+(carbs*4)+(fats*9);
    }

    caloriesTotal(intake: number, burned: number): number {
        return (intake - burned);
    }

    // key namespaced by date
    keyForDate(iso?: string) {
        const d = iso ?? this.todayDate;
        return `dailyPlan:${d}`;
    }

    // Returns stored daily data for today (or null)
    async getDailyUserData(dateIso?: string): Promise<DailyUserData | null> {
        const key = this.keyForDate(dateIso);

        // if user is authenticated, try Firestore first
        try {
            const user = this.auth.currentUser;
            if (user) {
                const date = dateIso ?? this.todayDate;
                const ref = doc(this.firestore, `users/${user.uid}/daily/${date}`);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const d = snap.data() as any;
                    // map Firestore document to DailyUserData shape
                    const fromFs: DailyUserData = {
                        date: d.date ?? date,
                        activityType: d.activityType ?? d.activity ?? 'Rest Day',
                        waterConsumedL: Number(d.waterConsumedL ?? 0),
                        steps: Number(d.steps ?? 0),
                        stepTarget: Number(d.stepTarget ?? 3000),
                        macrosPct: {
                            protein: Number(d.macrosPct?.protein ?? d.protein ?? 0),
                            carbs: Number(d.macrosPct?.carbs ?? d.carbs ?? 0),
                            fats: Number(d.macrosPct?.fats ?? d.fats ?? 0),
                        },
                        caloriesIntake: Number(d.caloriesIntake ?? 0),
                        caloriesBurned: Number(d.caloriesBurned ?? 0),
                        caloriesTotal: Number(d.caloriesTotal ?? 0),
                    } as DailyUserData;

                    // keep local copy in sync
                    this.ls.set(key, fromFs);
                    return fromFs;
                }
            }
        } catch (err) {
            // non-fatal, fallback to local storage
            this.alerts?.warn('Firestore read for daily data failed, using local cache', err as string);
        }

        return this.ls.get<DailyUserData>(key) ?? null;
    }

    // Build a complete DailyUserData from an optional partial and existing stored value
    buildComplete(patch: Partial<DailyUserData> = {}, existing?: DailyUserData): DailyUserData {
        const baseDate = patch.date ?? existing?.date ?? this.todayDate;

        const macros = {
            protein: Number(patch.macrosPct?.protein ?? existing?.macrosPct?.protein ?? 0),
            carbs: Number(patch.macrosPct?.carbs ?? existing?.macrosPct?.carbs ?? 0),
            fats: Number(patch.macrosPct?.fats ?? existing?.macrosPct?.fats ?? 0),
        };

            // If the caller provided macros (even if some are zero), prefer computing
            // caloriesIntake from those macros so a literal 0 in patch.caloriesIntake
            // won't overwrite the expected computed intake.
            const hasMacrosInPatch = patch.macrosPct && (
                patch.macrosPct.protein !== undefined ||
                patch.macrosPct.carbs !== undefined ||
                patch.macrosPct.fats !== undefined
            );

            const caloriesIntake = hasMacrosInPatch
                ? this.caloriesFromMacros(macros.protein, macros.carbs, macros.fats)
                : Number(patch.caloriesIntake ?? existing?.caloriesIntake ?? this.caloriesFromMacros(macros.protein, macros.carbs, macros.fats));
        const caloriesBurned = Number(patch.caloriesBurned ?? existing?.caloriesBurned ?? 0);

        const result: DailyUserData = {
            date: baseDate,
            activityType: patch.activityType ?? existing?.activityType ?? 'Rest Day',
            waterConsumedL: Number(patch.waterConsumedL ?? existing?.waterConsumedL ?? 0),
            steps: Number(patch.steps ?? existing?.steps ?? 0),
            stepTarget: Number(patch.stepTarget ?? existing?.stepTarget ?? 3000),
            macrosPct: macros,
            caloriesIntake: caloriesIntake,
            caloriesBurned: caloriesBurned,
            caloriesTotal: this.caloriesTotal(caloriesIntake, caloriesBurned),
        } as DailyUserData;

        // ensure caloriesIntake is always a number (not undefined/null)
        if (result.caloriesIntake === undefined || result.caloriesIntake === null) {
            // use calculated macros from above to avoid possible undefined access on result
            result.caloriesIntake = this.caloriesFromMacros(macros.protein, macros.carbs, macros.fats);
            result.caloriesTotal = this.caloriesTotal(result.caloriesIntake, caloriesBurned);
        }
        return result;
    }

    // Persist the daily data for today (or specified date)
    async setDailyUserData(patch: Partial<DailyUserData>): Promise<DailyUserData> {
        const key = this.keyForDate(patch.date ?? this.todayDate);
        const existing = this.ls.get<DailyUserData>(key);

        const updated = this.buildComplete(patch, existing ?? undefined);

        this.ls.set(key, updated);
        // attempt to persist in Firestore for authenticated user
        try {
            const user = this.auth.currentUser;

            if (user) {
                const date = patch.date ?? this.todayDate;
                const ref = doc(this.firestore, `users/${user.uid}/daily/${date}`);
                await setDoc(ref, { ...updated, updatedAt: serverTimestamp() }, { merge: true });
                this.alerts?.success('Daily data saved to Firestore');
            }
        } catch (err) {
            // non-fatal: warn user and continue
            this.alerts?.warn('Failed to persist daily data to Firestore; saved locally', err as string);
        }

        return updated;
    }




}
