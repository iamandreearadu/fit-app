import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';

@Component({
  selector: 'app-move-up',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './move-up.component.html',
  styleUrl: './move-up.component.css'
})
export class MoveUpComponent {
  showButton = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

    // Show button after scrolling 300px
    this.showButton = scrollPosition > 300;
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
