import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  selector: 'app-hero-slider',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './hero-slider.component.html',
  styleUrl: './hero-slider.component.css'
})
export class HeroSliderComponent {
  currentSlide = 0;

  slides = [
    {
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=600&fit=crop',
      title: 'Your Fitness Journey Starts Here',
      subtitle: 'Track, Monitor, Achieve',
      description: 'Take control of your health with our comprehensive fitness tracking platform. Monitor your progress, set goals, and achieve results that last.',
      motivations: [
        { icon: 'insights', text: 'Real-time progress tracking' },
        { icon: 'local_fire_department', text: 'Calorie & macro monitoring' },
        { icon: 'emoji_events', text: 'Achieve your fitness goals' },
        { icon: 'favorite', text: 'Build healthy habits' }
      ]
    },
    {
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=600&fit=crop',
      title: 'Every Rep Counts',
      subtitle: 'Progress Over Perfection',
      description: 'Transform your body with science-backed metrics and personalized recommendations. Calculate BMI, BMR, TDEE and more.',
      motivations: [
        { icon: 'fitness_center', text: 'Personalized fitness metrics' },
        { icon: 'trending_up', text: 'Track your improvements' },
        { icon: 'timer', text: 'Daily activity logging' },
        { icon: 'psychology', text: 'Smart recommendations' }
      ]
    },
    {
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=600&fit=crop',
      title: 'Fuel Your Success',
      subtitle: 'Nutrition Meets Performance',
      description: 'Optimize your nutrition with detailed meal tracking and macro analysis. Stay hydrated, energized, and ready to perform.',
      motivations: [
        { icon: 'restaurant', text: 'Complete meal tracking' },
        { icon: 'water_drop', text: 'Hydration monitoring' },
        { icon: 'speed', text: 'Macro & micro nutrients' },
        { icon: 'check_circle', text: 'Daily nutrition goals' }
      ]
    }
  ];

  constructor() {
    // Auto-advance slider every 5 seconds
    setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    }, 5000);
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }
}
