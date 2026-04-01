import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { WorkoutsContentComponent } from './workouts-content/workouts-content.component';

@Component({
  selector: 'app-workouts',
  standalone: true,
  imports: [CommonModule,HeaderComponent,FooterComponent,WorkoutsContentComponent],
  templateUrl: './workouts.component.html',
  styleUrl: './workouts.component.css'
})
export class WorkoutsComponent {

}