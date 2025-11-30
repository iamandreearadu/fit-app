import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../core/material/material.module';
import { RouterModule } from '@angular/router';
import { AccountFacade } from '../../../core/facade/account.facade';

@Component({
  standalone: true,
  selector: 'app-footer',
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  public accountFacade = inject(AccountFacade);

  currentYear = new Date().getFullYear();

  socialLinks = [
    { name: 'Facebook', icon: 'facebook', url: '#' },
    { name: 'Instagram', icon: 'camera_alt', url: '#' },
    { name: 'Twitter', icon: 'alternate_email', url: '#' },
    { name: 'LinkedIn', icon: 'work', url: '#' }
  ];

  quickLinks = [
    { label: 'Home', route: '/', requiresAuth: false },
    { label: 'Blog', route: '/blog', requiresAuth: false },
    { label: 'Dashboard', route: '/dashboard', requiresAuth: true },
    { label: 'Profile', route: '/user-profile', requiresAuth: true }
  ];

  legalLinks = [
    { label: 'Privacy Policy', route: '/privacy' },
    { label: 'Terms of Service', route: '/terms' },
    { label: 'Cookie Policy', route: '/cookies' }
  ];
}
