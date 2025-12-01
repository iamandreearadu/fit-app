import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../core/material/material.module';
import { AccountFacade } from '../../../core/facade/account.facade';

@Component({
  selector: 'app-benefits-showcase',
  standalone: true,
  imports: [CommonModule, RouterLink, MaterialModule],
  templateUrl: './benefits-showcase.component.html',
  styleUrl: './benefits-showcase.component.css'
})
export class BenefitsShowcaseComponent {
  public accountFacade = inject(AccountFacade);
  benefits = [
    'Real-time fitness metrics calculation',
    'Daily activity and nutrition logging',
    'Goal-oriented progress tracking',
    'Secure cloud data storage',
    'Mobile-friendly responsive design',
    'Expert health and fitness content'
  ];
}
