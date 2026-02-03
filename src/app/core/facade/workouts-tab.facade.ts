import { computed, inject, Injectable, signal } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { WorkoutsTabService } from "../services/workouts-tab.service";
import { WorkoutTemplate, WorkoutType } from "../models/workouts-tab.model";

@Injectable({ 
  providedIn: "root"
 })
 
export class WorkoutsTabFacade {
  private readonly workoutsSvc = inject(WorkoutsTabService);

  private readonly _templates = signal<WorkoutTemplate[]>([]);
  private readonly _selectedTemplate = signal<WorkoutTemplate | null>(null);
  private readonly _loading = signal(false);

  get templates(): WorkoutTemplate[] {
    return this._templates();
  }

  get selectedTemplate(): WorkoutTemplate | null {
    return this._selectedTemplate();
  }

  get loading(): boolean {
    return this._loading();
  }

  templates$ = toObservable(this._templates);
  selectedTemplate$ = toObservable(this._selectedTemplate);

  templateTypes = computed(() => {
    const set = new Set<WorkoutType>();
    this._templates().forEach(t => {
      if (t.type) set.add(t.type as WorkoutType);
    });
    return Array.from(set);
  });

  constructor() {}

  async loadTemplates(): Promise<void> {
    this._loading.set(true);
    try {
      const templates = await this.workoutsSvc.listTemplates();
      this._templates.set(templates);
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
    try {
      const t = await this.workoutsSvc.getTemplate(docId);
      this._selectedTemplate.set(t);
    } finally {
      this._loading.set(false);
    }
  }

  async createOrUpdateTemplate(editModel: Partial<WorkoutTemplate>): Promise<void> {
    if (!editModel) return;

    this._loading.set(true);
    try {
      if (editModel.uid) {
        const updated = await this.workoutsSvc.updateTemplateByUid(editModel.uid, editModel);
        if (updated) {
          await this.loadTemplates();
          this._selectedTemplate.set(updated);
        }
        return;
      }

      if (editModel.id) {
        const updated = await this.workoutsSvc.updateTemplateByNumericId(Number(editModel.id), editModel);
        if (updated) {
          await this.loadTemplates();
          this._selectedTemplate.set(updated);
        }
        return;
      }

      const created = await this.workoutsSvc.addTemplate(editModel);
      if (created) {
        await this.loadTemplates();
        this._selectedTemplate.set(created);
      }
    } finally {
      this._loading.set(false);
    }
  }

  async deleteTemplate(uid?: string): Promise<void> {
    if (!uid) return;

    this._loading.set(true);
    try {
      const success = await this.workoutsSvc.deleteTemplateByUid(uid);
      if (success) {
        this._selectedTemplate.set(null);
        await this.loadTemplates();
      }
    } finally {
      this._loading.set(false);
    }
  }

  clearSelection(): void {
    this._selectedTemplate.set(null);
  }
}
