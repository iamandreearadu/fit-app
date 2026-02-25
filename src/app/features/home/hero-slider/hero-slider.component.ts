import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../core/material/material.module';
import { AccountFacade } from '../../../core/facade/account.facade';

@Component({
  selector: 'app-hero-slider',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterLink],
  templateUrl: './hero-slider.component.html',
  styleUrl: './hero-slider.component.css'
})
export class HeroSliderComponent implements OnDestroy {
  public accountFacade = inject(AccountFacade);
  currentSlide = 0;
  private timer: ReturnType<typeof setInterval>;

  slides = [
    {
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=600&fit=crop',
      eyebrow: 'Track · Monitor · Achieve',
      title: 'Your Fitness Journey',
      titleAccent: 'Starts Here',
      description: 'Take control of your health with our comprehensive fitness tracking platform. Monitor your progress, set goals, and achieve results that last.',
      motivations: [
        { icon: 'insights',              color: '#7C4DFF', text: 'Real-time progress tracking' },
        { icon: 'local_fire_department', color: '#ff4081', text: 'Calorie & macro monitoring' },
        { icon: 'emoji_events',          color: '#7C4DFF', text: 'Achieve your fitness goals' },
        { icon: 'favorite',              color: '#ff4081', text: 'Build healthy habits' }
      ]
    },
    {
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=600&fit=crop',
      eyebrow: 'Progress Over Perfection',
      title: 'Every Rep',
      titleAccent: 'Counts',
      description: 'Transform your body with science-backed metrics and personalized recommendations. Calculate BMI, BMR, TDEE and more.',
      motivations: [
        { icon: 'fitness_center', color: '#ff4081', text: 'Personalized fitness metrics' },
        { icon: 'trending_up',    color: '#7C4DFF', text: 'Track your improvements' },
        { icon: 'timer',          color: '#ff4081', text: 'Daily activity logging' },
        { icon: 'psychology',     color: '#7C4DFF', text: 'Smart recommendations' }
      ]
    },
    {
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&h=600&fit=crop',
      eyebrow: 'Nutrition Meets Performance',
      title: 'Fuel Your',
      titleAccent: 'Success',
      description: 'Optimize your nutrition with detailed meal tracking and macro analysis. Stay hydrated, energized, and ready to perform.',
      motivations: [
        { icon: 'restaurant',   color: '#7C4DFF', text: 'Complete meal tracking' },
        { icon: 'water_drop',   color: '#ff4081', text: 'Hydration monitoring' },
        { icon: 'speed',        color: '#7C4DFF', text: 'Macro & micro nutrients' },
        { icon: 'check_circle', color: '#ff4081', text: 'Daily nutrition goals' }
      ]
    }
  ];

  constructor() {
    this.timer = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    }, 6000);
  }

  ngOnDestroy(): void { clearInterval(this.timer); }
  goToSlide(index: number): void { this.currentSlide = index; }
}
