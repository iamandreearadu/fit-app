import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { UserFacade } from '../../../core/facade/user.facade';
import { DailyUserData } from '../../../core/models/daily-user-data.model';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
facade = inject(UserFacade);
todayDate = new Date().toISOString().slice(0,10)

dayData = signal<DailyUserData | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const d = await this.facade.getDailyData();
      this.dayData.set(d);
    } catch (err) {
      // ignore - keep dayData null
      console.error('Failed to load daily data', err);
    }
  }

get user(){
  return this.facade.user();
}

get metrics(){
  return this.facade.metrics();
}




}
