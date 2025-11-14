import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DashboardComponent } from "./dashboard/dashboard.component";
import { DailyUserDataComponent } from './daily-user-data/daily-user-data.component';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, DashboardComponent,DailyUserDataComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

}
