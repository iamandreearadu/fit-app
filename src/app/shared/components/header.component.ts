import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AccountFacade } from '../../core/facade/account.facade';
import { MaterialModule } from '../../core/material/material.module';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule, RouterLink, MaterialModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  public accountFacade = inject(AccountFacade);
}
