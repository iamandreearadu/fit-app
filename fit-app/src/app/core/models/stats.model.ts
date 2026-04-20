export interface WeeklyVolume {
  weekStart: string; // ISO date "2026-03-16"
  volumeKg: number;
}

export interface RecentWorkout {
  id: number;
  name: string;
  date: string; // ISO date "2026-04-10"
  volumeKg: number;
}

export interface UserPublicStats {
  activeStreak: number;
  workoutsThisMonth: number;
  volumeThisMonth: number;
  weeklyVolumes: WeeklyVolume[];
  recentWorkouts: RecentWorkout[];
}

