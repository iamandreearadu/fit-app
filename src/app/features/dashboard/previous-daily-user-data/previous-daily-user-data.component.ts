import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { UserFacade } from '../../../core/facade/user.facade';
import { DailyUserData } from '../../../core/models/daily-user-data.model';
import { CommonModule, NgFor } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';
import { WorkoutsTabFacade } from '../../../core/facade/workouts-tab.facade';

interface WeekGroup {
  start: Date;
  end: Date;
  days: DailyUserData[];
}

@Component({
  selector: 'app-previous-daily-user-data',
  standalone: true,
  imports: [CommonModule, NgFor, MaterialModule],
  templateUrl: './previous-daily-user-data.component.html',
  styleUrl: './previous-daily-user-data.component.css'
})
export class PreviousDailyUserDataComponent implements OnInit {

  public facade = inject(UserFacade);
  public workoutsTabFacade = inject(WorkoutsTabFacade);

  history = this.facade.history;

  selectedDay: DailyUserData | null = null;
  showModal = false;

  currentWeekIndex = signal(0);

  
 weeks = computed<WeekGroup[]>(() => {
  const days = [...this.history()]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const map = new Map<string, WeekGroup>();

  days.forEach(day => {
    const dateObj = new Date(day.date); 
    const monday = this.getMonday(dateObj);
    const key = monday.toISOString();

    if (!map.has(key)) {
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      map.set(key, {
        start: monday,
        end: sunday,
        days: []
      });
    }

    map.get(key)!.days.push(day);
  });

  return Array.from(map.values());
});


  currentWeek = computed(() =>
    this.weeks()[this.currentWeekIndex()] ?? null
  );


  ngOnInit(): void {
    this.facade.loadDailyHistory();
  }


  prevWeek() {
    if (this.currentWeekIndex() < this.weeks().length - 1) {
      this.currentWeekIndex.update(i => i + 1);
    }
  }

  nextWeek() {
    if (this.currentWeekIndex() > 0) {
      this.currentWeekIndex.update(i => i - 1);
    }
  }


  openDay(day: DailyUserData) {
    this.selectedDay = day;
    this.showModal = true;
  }

  closeModal() {
    this.selectedDay = null;
    this.showModal = false;
  }

  resolveActivityLabel(activityType: string | undefined): string {
    if (!activityType) return '-';
    if (activityType.startsWith('workout:')) {
      const uid = activityType.replace('workout:', '');
      return this.workoutsTabFacade.templates.find(t => t.uid === uid)?.title ?? 'My Workout';
    }
    const labels: Record<string, string> = {
      'strength-training': 'Strength Training',
      'cardio': 'Cardio',
      'hiit-training': 'HIIT Training',
      'active-rest-day': 'Active Rest Day',
      'rest-day': 'Rest Day',
    };
    return labels[activityType] ?? activityType;
  }

  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay() || 7;
    if (day !== 1) {
      d.setDate(d.getDate() - day + 1);
    }
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
