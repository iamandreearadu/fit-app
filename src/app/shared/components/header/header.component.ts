import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AccountFacade } from '../../../core/facade/account.facade';
import { MaterialModule } from '../../../core/material/material.module';
import { NavigationService } from '../../services/navigation.service';
import { UserStore } from '../../../core/store/user.store';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule, RouterLink, MaterialModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  public accountFacade = inject(AccountFacade);
  public navService = inject(NavigationService);
  public userStore = inject(UserStore);
  private router = inject(Router);

  public avatarUrl = computed(() => {
    const user = this.userStore.user();
    const gender = user?.gender;

    if (gender === 'female') {
      return 'https://i.pravatar.cc/150?img=47';
    } else if (gender === 'male') {
      return 'https://i.pravatar.cc/150?img=12';
    } else {
      return 'https://i.pravatar.cc/150?img=68';
    }
  });

  public displayName = computed(() => {
    const user = this.userStore.user();
    return user?.fullName || this.accountFacade.authUser()?.fullName || this.accountFacade.authUser()?.email || 'User';
  });

  public logout() {
    this.accountFacade.logout();
    this.router.navigate(['/']);
  }
}
