import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { MaterialModule } from '../../core/material/material.module';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HeroSliderComponent } from './hero-slider/hero-slider.component';
import { FeaturesGridComponent } from './features-grid/features-grid.component';
import { BenefitsShowcaseComponent } from './benefits-showcase/benefits-showcase.component';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [
    CommonModule,
    HeaderComponent,
    MaterialModule,
    FooterComponent,
    HeroSliderComponent,
    FeaturesGridComponent,
    BenefitsShowcaseComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent {
}
