import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AccountFacade } from '../../../core/facade/account.facade';
import { UserStore } from '../../../core/store/user.store';

@Component({
  selector: 'app-side-drawer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './app-side-drawer.component.html',
  styleUrl: './app-side-drawer.component.css',
})
export class AppSideDrawerComponent implements OnChanges {
  @Input() open = false;
  @Output() closeRequested = new EventEmitter<void>();

  /** Focus target on open — the × close button */
  @ViewChild('closeBtn') private closeBtn?: ElementRef<HTMLButtonElement>;

  private readonly userStore = inject(UserStore);
  private readonly accountFacade = inject(AccountFacade);
  private readonly router = inject(Router);

  readonly userName = computed(() => this.userStore.user()?.fullName ?? 'You');
  readonly userAvatar = computed(() => this.userStore.user()?.imageUrl ?? '');

  readonly userInitials = computed(() => {
    const name = this.userStore.user()?.fullName ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0] ?? '')
      .join('')
      .toUpperCase();
  });

  readonly userGoal = computed(() => this.userStore.user()?.goal ?? 'maintain');

  readonly goalLabel = computed((): string => {
    const labels: Record<string, string> = {
      maintain: 'Maintain',
      lose: 'Lose Weight',
      gain: 'Build Muscle',
    };
    return labels[this.userGoal()] ?? 'Maintain';
  });

  readonly goalBadgeClass = computed((): string => {
    const classes: Record<string, string> = {
      maintain: 'pill-info',
      lose: 'pill-danger',
      gain: 'pill-success',
    };
    return classes[this.userGoal()] ?? 'pill-info';
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      // Defer to allow the DOM to become interactive (inert removed)
      setTimeout(() => this.closeBtn?.nativeElement?.focus(), 60);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.close();
  }

  close(): void {
    this.closeRequested.emit();
  }

  navigateToProfile(): void {
    this.close();
    this.router.navigate(['/social/profile/me']);
  }

  navigateTo(route: string): void {
    this.close();
    this.router.navigate([route]);
  }

  logout(): void {
    this.close();
    void this.accountFacade.logout();
    this.router.navigate(['/']);
  }
}
