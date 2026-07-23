import { AfterViewInit, Component, DestroyRef, ElementRef, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '../../core/material/material.module';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { AccountFacade } from '../../core/facade/account.facade';
import { UserStore } from '../../core/store/user.store';
import { UserFacade } from '../../core/facade/user.facade';
import { ACCOUNT_TABS, isAccountTab } from './account-tab.model';

@Component({
  standalone: true,
  selector: 'app-user-page',
  imports: [
    CommonModule,
    MaterialModule,
    HeaderComponent,
    FooterComponent,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './user-page.component.html',
  styleUrl: './user-page.component.css'
})
export class UserPageComponent implements OnInit, AfterViewInit {
  public accountFacade = inject(AccountFacade);
  public userStore = inject(UserStore);
  private userFacade = inject(UserFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  public streak = this.userFacade.streak;
  readonly tabs = ACCOUNT_TABS;

  ngOnInit(): void {
    this.userFacade.loadStreak();

    const legacyTab = this.route.snapshot.queryParamMap.get('tab');
    if (isAccountTab(legacyTab)) {
      const queryParams = { ...this.route.snapshot.queryParams };
      delete queryParams['tab'];
      const destination = legacyTab === 'profile' ? 'my-account' : legacyTab;
      void this.router.navigate(['/account', destination], {
        replaceUrl: true,
        queryParams,
      });
    }
  }

  ngAfterViewInit(): void {
    this.scrollActiveMobileTabIntoView();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.scrollActiveMobileTabIntoView());
  }

  sidebarCollapsed = false;

  public avatarUrl = computed(() => {
    const user = this.userStore.user();
    return user?.imageUrl || 'assets/user.png';
  });

  public displayName = computed(() => {
    const user = this.userStore.user();
    return user?.fullName || this.accountFacade.authUser()?.fullName || 'User';
  });

  public displayEmail = computed(() => {
    const user = this.userStore.user();
    return user?.email || this.accountFacade.authUser()?.email || '';
  });

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  private scrollActiveMobileTabIntoView(): void {
    requestAnimationFrame(() => {
      const activeTab = this.host.nativeElement.querySelector<HTMLElement>('.mob-tab.active');
      activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }
}
