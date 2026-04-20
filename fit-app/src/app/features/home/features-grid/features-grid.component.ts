import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  selector: 'app-features-grid',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './features-grid.component.html',
  styleUrl: './features-grid.component.css'
})
export class FeaturesGridComponent {
  features = [
    {
      icon: 'dashboard',
      color: '#7C4DFF',
      title: 'Smart Dashboard',
      description: 'Track your progress with an intuitive dashboard showing your weight, calories, and daily goals.'
    },
    {
      icon: 'restaurant',
      color: '#ff4081',
      title: 'Nutrition Tracking',
      description: 'Log your daily meals, track macros, calories, and stay on top of your nutrition goals.'
    },
    {
      icon: 'fitness_center',
      color: '#ff4081',
      title: 'Fitness Metrics',
      description: 'Calculate BMI, BMR, TDEE and get personalized recommendations based on your goals.'
    },
    {
      icon: 'trending_up',
      color: '#7C4DFF',
      title: 'Progress Monitoring',
      description: 'Monitor your water intake, steps, and daily activities to stay motivated.'
    },
    {
      icon: 'auto_stories',
      color: '#ff4081',
      title: 'Health Blog',
      description: 'Access fitness tips, workout plans, and nutrition advice from health experts.'
    },
    {
      icon: 'person',
      color: '#7C4DFF',
      title: 'Personalized Profile',
      description: 'Set your fitness goals, track physical stats, and customize your experience.'
    }
  ];
}
