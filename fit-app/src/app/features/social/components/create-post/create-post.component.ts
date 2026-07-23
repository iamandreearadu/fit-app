import { Component, ElementRef, HostListener, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SocialContentFacade } from '../../../../core/facade/social-content.facade';
import { CreatePostRequest } from '../../../../core/models/social.model';
import { WorkoutTemplate } from '../../../../core/models/workouts-tab.model';
import { WorkoutsTabService } from '../../../../api/workouts-tab.service';
import { NutritionTabService } from '../../../../api/nutrition-tab.service';
import { MealEntry } from '../../../../core/models/nutrition-tab.model';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.css'
})
export class CreatePostComponent implements OnDestroy {
  private readonly facade = inject(SocialContentFacade);
  private readonly workoutsService = inject(WorkoutsTabService);
  private readonly nutritionService = inject(NutritionTabService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly returnUrl = (history.state?.returnUrl ?? '/social') as string;

  content = signal('');
  imagePreview = signal<string | null>(null);
  isSubmitting = signal(false);
  isProcessingImage = signal(false);
  isDragOver = signal(false);
  error = signal<string | null>(null);
  savedWorkouts = signal<WorkoutTemplate[]>([]);
  selectedWorkout = signal<WorkoutTemplate | null>(null);
  pendingWorkoutId = signal<number | null>(null);
  workoutSearch = signal('');
  isActivityPickerOpen = signal(false);
  isLoadingWorkouts = signal(false);
  workoutsError = signal<string | null>(null);
  savedMeals = signal<MealEntry[]>([]);
  selectedMeal = signal<MealEntry | null>(null);
  pendingMealId = signal<number | null>(null);
  activityType = signal<'workout' | 'meal'>('workout');
  isLoadingMeals = signal(false);
  mealsError = signal<string | null>(null);
  private workoutsLoaded = false;
  private previousBodyOverflow = '';

  @ViewChild('activitySearch') activitySearch?: ElementRef<HTMLInputElement>;
  @ViewChild('activityPicker') activityPicker?: ElementRef<HTMLElement>;
  private returnFocusElement: HTMLElement | null = null;

  readonly filteredWorkouts = computed(() => {
    const query = this.workoutSearch().trim().toLocaleLowerCase();
    if (!query) return this.savedWorkouts();
    return this.savedWorkouts().filter(workout =>
      workout.title.toLocaleLowerCase().includes(query)
    );
  });
  readonly filteredMeals = computed(() => {
    const query = this.workoutSearch().trim().toLocaleLowerCase();
    return this.savedMeals().filter(meal => !query || meal.name.toLocaleLowerCase().includes(query));
  });

  get charCount(): number { return this.content().length; }
  get charClass(): string {
    if (this.charCount >= 480) return 'char-red';
    if (this.charCount >= 400) return 'char-yellow';
    return 'char-green';
  }
  get canPost(): boolean {
    return (this.content().trim().length > 0 || !!this.imagePreview() || !!this.selectedWorkout() || !!this.selectedMeal())
      && this.charCount <= 500;
  }

  async openActivityPicker(): Promise<void> {
    this.returnFocusElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.pendingWorkoutId.set(this.selectedWorkout()?.id ?? null);
    this.pendingMealId.set(this.selectedMeal()?.id ?? null);
    this.activityType.set(this.selectedMeal() ? 'meal' : 'workout');
    this.workoutSearch.set('');
    this.workoutsError.set(null);
    this.isActivityPickerOpen.set(true);
    this.lockPageScroll();
    setTimeout(() => this.activitySearch?.nativeElement.focus());
    if (!this.workoutsLoaded) await this.loadSavedWorkouts();
  }

  async chooseActivityType(type: 'workout' | 'meal'): Promise<void> {
    this.activityType.set(type);
    this.workoutSearch.set('');
    if (type === 'meal' && this.savedMeals().length === 0) await this.loadSavedMeals();
  }

  selectMeal(meal: MealEntry): void { this.pendingMealId.set(meal.id); }

  confirmActivity(): void {
    if (this.activityType() === 'meal') {
      const meal = this.savedMeals().find(item => item.id === this.pendingMealId());
      if (!meal) return;
      this.selectedMeal.set(meal);
      this.selectedWorkout.set(null);
    } else {
      const workout = this.savedWorkouts().find(item => item.id === this.pendingWorkoutId());
      if (!workout) return;
      this.selectedWorkout.set(workout);
      this.selectedMeal.set(null);
    }
    this.closeActivityPicker();
  }

  closeActivityPicker(): void {
    this.isActivityPickerOpen.set(false);
    this.unlockPageScroll();
    setTimeout(() => this.returnFocusElement?.focus());
  }

  selectWorkout(workout: WorkoutTemplate): void {
    this.pendingWorkoutId.set(workout.id);
  }

  confirmWorkout(): void {
    const workout = this.savedWorkouts().find(item => item.id === this.pendingWorkoutId());
    if (!workout) return;
    this.selectedWorkout.set(workout);
    this.closeActivityPicker();
  }

  removeActivity(event?: Event): void {
    event?.stopPropagation();
    this.selectedWorkout.set(null);
    this.selectedMeal.set(null);
    this.pendingWorkoutId.set(null);
  }

  private async loadSavedMeals(): Promise<void> {
    this.isLoadingMeals.set(true);
    this.mealsError.set(null);
    try { this.savedMeals.set(await this.nutritionService.listMeals(50)); }
    catch { this.mealsError.set('We could not load your meals.'); }
    finally { this.isLoadingMeals.set(false); }
  }

  async retryWorkouts(): Promise<void> {
    await this.loadSavedWorkouts();
  }

  private async loadSavedWorkouts(): Promise<void> {
    this.isLoadingWorkouts.set(true);
    this.workoutsError.set(null);
    try {
      const workouts = await this.workoutsService.listSavedTemplates();
      this.savedWorkouts.set(workouts);
      this.workoutsLoaded = true;
    } catch {
      this.workoutsError.set('We could not load your saved workouts.');
    } finally {
      this.isLoadingWorkouts.set(false);
      setTimeout(() => this.activitySearch?.nativeElement.focus());
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isActivityPickerOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeActivityPicker();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = this.activityPicker?.nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private lockPageScroll(): void {
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlockPageScroll(): void {
    document.body.style.overflow = this.previousBodyOverflow;
  }

  ngOnDestroy(): void {
    this.unlockPageScroll();
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      this.readFile(file);
    }
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.readFile(file);
  }

  private readFile(file: File): void {
    this.error.set(null);
    if (!file.type.startsWith('image/')) {
      this.error.set('Choose a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('The image must be smaller than 10 MB.');
      return;
    }
    this.isProcessingImage.set(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_PX = 1200;
        const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        this.imagePreview.set(compressed);
        this.isProcessingImage.set(false);
      };
      img.onerror = () => {
        this.isProcessingImage.set(false);
        this.error.set('This image could not be processed. Try another one.');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      this.isProcessingImage.set(false);
      this.error.set('This image could not be read. Try another one.');
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imagePreview.set(null);
    this.error.set(null);
  }

  async submit(): Promise<void> {
    if (!this.canPost || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.error.set(null);
    try {
      const req: CreatePostRequest = { content: this.content().trim() };
      if (this.imagePreview()) {
        req.imageUrl = this.imagePreview()!;
      }
      if (this.selectedWorkout()) {
        req.linkedWorkoutId = this.selectedWorkout()!.id;
      }
      if (this.selectedMeal()) req.linkedMealId = this.selectedMeal()!.id;
      await this.facade.createPost(req);
      await this.router.navigateByUrl(this.returnUrl);
    } catch {
      this.error.set('Your post could not be published. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  close(): void {
    this.location.back();
  }
}
