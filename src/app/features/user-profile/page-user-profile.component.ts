import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileUserDataComponent } from './profile-user-data/profile-user-data.component';

@Component({
  standalone: true,
  imports: [CommonModule, ProfileUserDataComponent],
  selector: 'app-page-user-profile',
  templateUrl: './page-user-profile.component.html',
  styleUrls: ['./page-user-profile.component.css'],
})
export class PageUserProfileComponent {}
