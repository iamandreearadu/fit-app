import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileUserDataComponent } from './profile-user-data/profile-user-data.component';
import { HeaderComponent } from '../../shared/components/header.component';

@Component({
  standalone: true,
  imports: [CommonModule, ProfileUserDataComponent, HeaderComponent],
  selector: 'app-page-user-profile',
  templateUrl: './page-user-profile.component.html',
  styleUrls: ['./page-user-profile.component.css'],
})
export class PageUserProfileComponent {}
