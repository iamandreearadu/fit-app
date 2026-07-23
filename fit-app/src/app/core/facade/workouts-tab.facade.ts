import { computed, inject, Injectable, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  CompleteSessionRequest,
  LastExerciseSession,
  WorkoutCompletionSummary,
  WorkoutTemplate,
  WorkoutType,
} from "../models/workouts-tab.model";
import { WorkoutsTabService } from "../../api/workouts-tab.service";
import { NotificationHubService } from "../services/notification-hub.service";

@Injectable({
  providedIn: "root"
 })

export class WorkoutsTabFacade {
  private workoutsSvc = inject(WorkoutsTabService);
  private readonly notifHub = inject(NotificationHubService);

  constructor() {
    // Fix 3 — listen for workout-completed SignalR push as a backup pathway.
    // The REST response in completeSession() sets completionSummary() first;
    // this subscription handles cases where the SignalR event arrives before the
    // REST promise resolves (rare) or when the facade is used across multiple tabs.
    this.notifHub.workoutCompleted$.pipe(takeUntilDestroyed()).subscribe(summary => {
      this.completionSummary.set(summary);
    });
  }

  private readonly _templates = signal<WorkoutTemplate[]>([]);
  private readonly _selectedTemplate = signal<WorkoutTemplate | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  /** Public reactive signal — used by WorkoutsGuidedEmptyComponent trigger check */
  readonly templatesSignal = this._templates.asReadonly();
  /** Public reactive loading signal — used by WorkoutsGuidedEmptyComponent */
  readonly loadingSignal = this._loading.asReadonly();
  /** Non-null when the last loadTemplates() call failed. */
  readonly error = this._error.asReadonly();

  // ── Fix 6: Session state ────────────────────────────────────────────────────
  readonly lastSession = signal<LastExerciseSession[]>([]);
  readonly completionSummary = signal<WorkoutCompletionSummary | null>(null);

  /** Map from exerciseName → LastExerciseSession for O(1) lookup in set row ghost text */
  readonly lastSessionMap = computed(
    () => new Map(this.lastSession().map(s => [s.exerciseName, s]))
  );

  get templates(): WorkoutTemplate[] {
    return this._templates();
  }

  get selectedTemplate(): WorkoutTemplate | null {
    return this._selectedTemplate();
  }

  get loading(): boolean {
    return this._loading();
  }

  templateTypes = computed(() => {
    const set = new Set<WorkoutType>();
    this._templates().forEach(t => {
      if (t.type) set.add(t.type as WorkoutType);
    });
    return Array.from(set);
  });

  async loadTemplates(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const templates = await this.workoutsSvc.listTemplates();
      this._templates.set(templates);
    } catch {
      this._error.set('Failed to load workouts. Please try again.');
    } finally {
      this._loading.set(false);
    }
  }

  async getTemplate(docId?: string | null): Promise<void> {
    if (!docId) {
      this._selectedTemplate.set(null);
      return;
    }
    this._loading.set(true);
    this._error.set(null);
    try {
      const t = await this.workoutsSvc.getTemplate(docId);
      if (!t) {
        this._error.set('Failed to load workout. Please try again.');
        return;
      }
      this._selectedTemplate.set(t);
    } catch {
      this._error.set('Failed to load workout. Please try again.');
    } finally {
      this._loading.set(false);
    }
  }

  async createOrUpdateTemplate(editModel: Partial<WorkoutTemplate>): Promise<void> {
    if (!editModel) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      if (editModel.uid) {
        const updated = await this.workoutsSvc.updateTemplateByUid(editModel.uid, editModel);
        if (updated) {
          await this.loadTemplates();
          this._selectedTemplate.set(updated);
        } else {
          this._error.set('Failed to save workout. Please try again.');
        }
        return;
      }

      const created = await this.workoutsSvc.addTemplate(editModel);
      if (created) {
        await this.loadTemplates();
        this._selectedTemplate.set(created);
      } else {
        this._error.set('Failed to save workout. Please try again.');
      }
    } catch {
      this._error.set('Failed to save workout. Please try again.');
    } finally {
      this._loading.set(false);
    }
  }

  async deleteTemplate(uid?: string): Promise<void> {
    if (!uid) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      const success = await this.workoutsSvc.deleteTemplateByUid(uid);
      if (success) {
        this._selectedTemplate.set(null);
        await this.loadTemplates();
      } else {
        this._error.set('Failed to delete workout. Please try again.');
      }
    } catch {
      this._error.set('Failed to delete workout. Please try again.');
    } finally {
      this._loading.set(false);
    }
  }

  clearSelection(): void {
    this._selectedTemplate.set(null);
  }

  // ── Fix 7: Guided empty state — clone system template ────────────────────────

  /**
   * Creates a personal copy of a system template (POST /api/workouts).
   * After success, reloads the template list so the guided state disappears.
   * Returns the new personal template's ID, or null on failure.
   */
  async cloneSystemTemplate(template: WorkoutTemplate): Promise<number | null> {
    const payload: Partial<WorkoutTemplate> = {
      title: template.title,
      type: template.type,
      durationMin: template.durationMin,
      caloriesEstimateKcal: template.caloriesEstimateKcal,
      notes: template.notes,
      exercises: template.exercises,
      cardio: template.cardio,
    };
    const created = await this.workoutsSvc.addTemplate(payload);
    if (created) {
      await this.loadTemplates();
      return created.id;
    }
    return null;
  }

  // ── Fix 6: Session methods ───────────────────────────────────────────────────

  /**
   * Loads previous session data for ghost placeholder text in set rows.
   * Clears lastSession first so stale data is never shown during navigation.
   */
  async loadLastSession(templateId: number): Promise<void> {
    this.lastSession.set([]);
    const data = await this.workoutsSvc.getLastSession(templateId);
    this.lastSession.set(data);
  }

  /**
   * Saves a completed workout session.
   * Sets completionSummary signal on success (triggers WorkoutCompletionCardComponent).
   * Returns the summary so callers can branch on success/failure.
   */
  async completeSession(req: CompleteSessionRequest): Promise<WorkoutCompletionSummary | null> {
    const summary = await this.workoutsSvc.completeSession(req);
    this.completionSummary.set(summary);
    return summary;
  }

  /**
   * Fix 3 — called by WorkoutCompletionCardComponent on dismiss.
   * Resets signal so the overlay is removed from DOM.
   */
  resetCompletionSummary(): void {
    this.completionSummary.set(null);
  }
}
