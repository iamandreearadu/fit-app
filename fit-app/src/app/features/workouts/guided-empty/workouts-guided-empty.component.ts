import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WorkoutsTabFacade } from '../../../core/facade/workouts-tab.facade';
import { WorkoutTemplate } from '../../../core/models/workouts-tab.model';
import { AlertService } from '../../../shared/services/alert.service';

interface TemplateVisualConfig {
  badge: string;
  badgeColor: 'strength' | 'gain' | 'lose' | 'maintain';
  icon: string;
  muscleGroups: string;
}

const TEMPLATE_VISUAL_CONFIGS: Record<string, TemplateVisualConfig> = {
  'Push Day': {
    badge: 'STRENGTH',
    badgeColor: 'strength',
    icon: 'fitness_center',
    muscleGroups: 'Chest · Shoulders · Triceps',
  },
  'Pull Day': {
    badge: 'STRENGTH',
    badgeColor: 'strength',
    icon: 'fitness_center',
    muscleGroups: 'Back · Biceps · Rear Delts',
  },
  'Full Body': {
    badge: 'FULL BODY',
    badgeColor: 'gain',
    icon: 'accessibility_new',
    muscleGroups: 'Legs · Chest · Back · Shoulders',
  },
};

const DEFAULT_VISUAL_CONFIG: TemplateVisualConfig = {
  badge: 'WORKOUT',
  badgeColor: 'strength',
  icon: 'fitness_center',
  muscleGroups: '',
};

const PREVIEW_COUNT = 4;

@Component({
  selector: 'app-workouts-guided-empty',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule],
  templateUrl: './workouts-guided-empty.component.html',
  styleUrl: './workouts-guided-empty.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutsGuidedEmptyComponent {
  /** System templates from the backend — passed by workouts-tab parent. */
  @Input({ required: true }) templates: WorkoutTemplate[] = [];
  /** Emitted when user clicks "Or create your own workout". */
  @Output() createOwn = new EventEmitter<void>();

  private readonly facade = inject(WorkoutsTabFacade);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertService);

  /** ID of the template whose Start button is currently loading. null = none. */
  readonly startingId = signal<number | null>(null);

  getConfig(template: WorkoutTemplate): TemplateVisualConfig {
    return TEMPLATE_VISUAL_CONFIGS[template.title] ?? DEFAULT_VISUAL_CONFIG;
  }

  getPreviewExercises(template: WorkoutTemplate): WorkoutTemplate['exercises'] {
    return (template.exercises ?? []).slice(0, PREVIEW_COUNT);
  }

  getMoreCount(template: WorkoutTemplate): number {
    return Math.max(0, (template.exercises?.length ?? 0) - PREVIEW_COUNT);
  }

  getTotalSets(template: WorkoutTemplate): number {
    return (template.exercises ?? []).reduce((sum, ex) => sum + ex.sets, 0);
  }

  async startWorkout(template: WorkoutTemplate, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.startingId() !== null) return; // prevent double-tap

    this.startingId.set(template.id);
    try {
      const newId = await this.facade.cloneSystemTemplate(template);
      if (newId !== null) {
        this.router.navigate(['/workout-session', newId]);
      } else {
        this.alerts.error("Couldn't create workout. Try again.");
      }
    } catch {
      this.alerts.error("Couldn't create workout. Try again.");
    } finally {
      this.startingId.set(null);
    }
  }
}
