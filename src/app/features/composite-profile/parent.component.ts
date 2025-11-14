import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileUserDataComponent } from '../user-profile/profile-user-data/profile-user-data.component';
import { UserFitMetricsComponent } from './user-fit-metrics/user-fit-metrics.component';
import { HeaderComponent } from '../../shared/components/header.component';

@Component({
  standalone: true,
  imports: [CommonModule, ProfileUserDataComponent, UserFitMetricsComponent, HeaderComponent],
  selector: 'app-parent-profile',
  templateUrl: './parent.component.html',
  styleUrls: ['./parent.component.css'],
})
export class ParentComponent {}
