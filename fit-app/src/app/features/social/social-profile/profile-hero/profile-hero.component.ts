import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { UserSocialProfile } from '../../../../core/models/social.model';


@Component({
  selector: 'app-profile-hero',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './profile-hero.component.html',
  styleUrl: './profile-hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHeroComponent {
  @Input() profile: UserSocialProfile | null = null;
  @Input() isOwnProfile: boolean = false;
  @Input() isFollowing: boolean = false;
  @Input() isTogglingFollow: boolean = false;
  @Input() loading: boolean = false;
  @Output() follow = new EventEmitter<void>();
  @Output() editProfile = new EventEmitter<void>();
  @Output() avatarClick = new EventEmitter<void>();

  get initials(): string {
    const name = this.profile?.displayName ?? '';
    return name.charAt(0).toUpperCase();
  }

  readonly goalLabel = '';
}
