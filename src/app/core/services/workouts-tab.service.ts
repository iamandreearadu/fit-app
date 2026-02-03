import { inject, Injectable, signal } from "@angular/core";
import { Firestore } from "@angular/fire/firestore";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  updateDoc,
  where,
  deleteDoc
} from "firebase/firestore";
import { AlertService } from "../../shared/services/alert.service";
import { Auth } from "@angular/fire/auth";
import { WorkoutTemplate, WorkoutType } from "../models/workouts-tab.model";

@Injectable({ 
  providedIn: "root" 
})

export class WorkoutsTabService {
  readonly loading = signal(false);

  private firestore = inject(Firestore);
  private alerts = inject(AlertService);
  private auth = inject<Auth>(Auth);

  private uidOrNull(): string | null {
    return (this.auth.currentUser as any)?.uid ?? null;
  }

  private ensureAuth(): string | null {
    const uid = this.uidOrNull();
    if (!uid) {
      this.alerts?.warn("You must be signed in to manage workouts");
      return null;
    }
    return uid;
  }

  private normalizeType(raw: any): WorkoutType {
    const t = String(raw ?? "").trim();
    const allowed: WorkoutType[] = ["Strength", "Circuit", "HIIT", "Crossfit", "Cardio", "Other"];
    return allowed.includes(t as WorkoutType) ? (t as WorkoutType) : "Strength";
  }

  private mapTemplate(s: any): WorkoutTemplate {
    const d = s.data?.() ?? s.data ?? {};
    const type = this.normalizeType(d.type);

    const title = (d.title ?? d.name ?? "").toString();
    const durationMin = Number(d.durationMin ?? d.estimatedMinutes ?? 0);
    const caloriesEstimateKcal = Number(d.caloriesEstimateKcal ?? d.caloriesEstimate ?? 0);

    const cardioSrc = d.cardio ?? null;

    return {
      uid: s.id,
      id: Number(d.id ?? Date.now()),
      title,
      type,
      durationMin,
      caloriesEstimateKcal,
      notes: (d.notes ?? "").toString(),

      exercises: type === "Cardio" ? [] : (Array.isArray(d.exercises) ? d.exercises : []),

      cardio: type === "Cardio"
        ? {
            km: Number(cardioSrc?.km ?? d.km ?? 0),
            incline: Number(cardioSrc?.incline ?? d.incline ?? 0),
            notes: (cardioSrc?.notes ?? "").toString()
          }
        : undefined,

      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null
    } as WorkoutTemplate;
  }

  async getTemplate(docId: string): Promise<WorkoutTemplate | null> {
    if (!docId) return null;
    const uid = this.ensureAuth();
    if (!uid) return null;

    try {
      const ref = doc(this.firestore as any, `users/${uid}/workoutTemplates/${docId}`);
      const snap = await getDoc(ref as any);
      if (!snap.exists()) return null;
      return this.mapTemplate({ id: docId, data: () => snap.data() });
    } catch (err) {
      console.error("WorkoutsTabService.getTemplate error", err);
      this.alerts?.warn("Failed to load workout", (err as any)?.message ?? String(err));
      return null;
    }
  }

  async listTemplates(): Promise<WorkoutTemplate[]> {
    const uid = this.ensureAuth();
    if (!uid) return [];

    try {
      const coll = collection(this.firestore as any, `users/${uid}/workoutTemplates`);
      const q = query(coll as any, orderBy("updatedAt", "desc")) as any;
      const snaps = await getDocs(q as any);

      const templates: WorkoutTemplate[] = [];
      snaps.forEach((s: any) => templates.push(this.mapTemplate(s)));
      return templates;
    } catch (err) {
      console.error("WorkoutsTabService.listTemplates error", err);
      this.alerts?.warn("Failed to load workouts", (err as any)?.message ?? String(err));
      return [];
    }
  }

  async addTemplate(payload: Partial<WorkoutTemplate>): Promise<WorkoutTemplate | null> {
    const uid = this.ensureAuth();
    if (!uid) return null;

    try {
      const coll = collection(this.firestore as any, `users/${uid}/workoutTemplates`);

      const type = this.normalizeType(payload.type);
      const isCardio = type === "Cardio";

      const data = {
        id: payload.id ?? Date.now(),
        title: (payload.title ?? "").toString(),
        type,
        durationMin: Number(payload.durationMin ?? 0),
        caloriesEstimateKcal: Number(payload.caloriesEstimateKcal ?? 0),
        notes: (payload.notes ?? "").toString(),

        exercises: isCardio ? [] : (Array.isArray(payload.exercises) ? payload.exercises : []),

        cardio: isCardio
          ? {
              km: Number((payload as any)?.cardio?.km ?? 0),
              incline: Number((payload as any)?.cardio?.incline ?? 0),
              notes: ((payload as any)?.cardio?.notes ?? "").toString()
            }
          : null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      } as any;

      const ref = await addDoc(coll as any, data);
      const snap = await getDoc(ref as any);
      if (!snap.exists()) return null;

      return this.mapTemplate({ id: ref.id, data: () => snap.data() });
    } catch (err) {
      console.error("WorkoutsTabService.addTemplate error", err);
      const code = (err as any)?.code ?? "";
      this.alerts?.warn(
        `Failed to add workout${code ? ` (${code})` : ""}`,
        (err as any)?.message ?? String(err)
      );
      return null;
    }
  }

  async updateTemplateByUid(docId: string, payload: Partial<WorkoutTemplate>): Promise<WorkoutTemplate | null> {
    const uid = this.ensureAuth();
    if (!uid) return null;
    if (!docId) return null;

    try {
      const ref = doc(this.firestore as any, `users/${uid}/workoutTemplates/${docId}`) as any;

      const type = this.normalizeType(payload.type);
      const isCardio = type === "Cardio";

      const patch = {
        ...(payload.title !== undefined ? { title: (payload.title ?? "").toString() } : {}),
        ...(payload.type !== undefined ? { type } : {}),
        ...(payload.durationMin !== undefined ? { durationMin: Number(payload.durationMin ?? 0) } : {}),
        ...(payload.caloriesEstimateKcal !== undefined ? { caloriesEstimateKcal: Number(payload.caloriesEstimateKcal ?? 0) } : {}),
        ...(payload.notes !== undefined ? { notes: (payload.notes ?? "").toString() } : {}),

        ...(payload.type !== undefined
          ? {
              exercises: isCardio ? [] : (Array.isArray(payload.exercises) ? payload.exercises : []),
              cardio: isCardio
                ? {
                    km: Number((payload as any)?.cardio?.km ?? 0),
                    incline: Number((payload as any)?.cardio?.incline ?? 0),
                    notes: ((payload as any)?.cardio?.notes ?? "").toString()
                  }
                : null
            }
          : {}),

        updatedAt: serverTimestamp()
      } as any;

      await updateDoc(ref, patch);

      const snap = await getDoc(ref as any);
      if (!snap.exists()) return null;

      return this.mapTemplate({ id: ref.id, data: () => snap.data() });
    } catch (err) {
      console.error("WorkoutsTabService.updateTemplateByUid error", err);
      this.alerts?.warn("Failed to update workout", (err as any)?.message ?? String(err));
      return null;
    }
  }

  async updateTemplateByNumericId(id: number, payload: Partial<WorkoutTemplate>): Promise<WorkoutTemplate | null> {
    const uid = this.ensureAuth();
    if (!uid) return null;

    try {
      const coll = collection(this.firestore as any, `users/${uid}/workoutTemplates`);
      const q = query(coll as any, where("id", "==", id)) as any;
      const snaps = await getDocs(q as any);
      if (snaps.empty) return null;

      const s = snaps.docs[0];
      const ref = s.ref as any;

      const type = this.normalizeType(payload.type);
      const isCardio = type === "Cardio";

      const patch = {
        ...(payload.title !== undefined ? { title: (payload.title ?? "").toString() } : {}),
        ...(payload.type !== undefined ? { type } : {}),
        ...(payload.durationMin !== undefined ? { durationMin: Number(payload.durationMin ?? 0) } : {}),
        ...(payload.caloriesEstimateKcal !== undefined ? { caloriesEstimateKcal: Number(payload.caloriesEstimateKcal ?? 0) } : {}),
        ...(payload.notes !== undefined ? { notes: (payload.notes ?? "").toString() } : {}),

        ...(payload.type !== undefined
          ? {
              exercises: isCardio ? [] : (Array.isArray(payload.exercises) ? payload.exercises : []),
              cardio: isCardio
                ? {
                    km: Number((payload as any)?.cardio?.km ?? 0),
                    incline: Number((payload as any)?.cardio?.incline ?? 0),
                    notes: ((payload as any)?.cardio?.notes ?? "").toString()
                  }
                : null
            }
          : {}),

        updatedAt: serverTimestamp()
      } as any;

      await updateDoc(ref, patch);

      const snap = await getDoc(ref as any);
      if (!snap.exists()) return null;

      return this.mapTemplate({ id: ref.id, data: () => snap.data() });
    } catch (err) {
      console.error("WorkoutsTabService.updateTemplateByNumericId error", err);
      this.alerts?.warn("Failed to update workout", (err as any)?.message ?? String(err));
      return null;
    }
  }

  async deleteTemplateByUid(docId: string): Promise<boolean> {
    const uid = this.ensureAuth();
    if (!uid) return false;
    if (!docId) return false;

    try {
      await deleteDoc(doc(this.firestore as any, `users/${uid}/workoutTemplates/${docId}`));
      this.alerts?.success("Workout deleted");
      return true;
    } catch (err) {
      console.error("WorkoutsTabService.deleteTemplateByUid error", err);
      this.alerts?.warn("Failed to delete workout", (err as any)?.message ?? String(err));
      return false;
    }
  }
}
