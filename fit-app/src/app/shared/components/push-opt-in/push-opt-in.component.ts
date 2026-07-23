import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MaterialModule } from '../../../core/material/material.module';
import { NotificationFacade } from '../../../core/facade/notification.facade';

@Component({
  selector: 'app-push-opt-in',
  standalone: true,
  imports: [MaterialModule],
  templateUrl: './push-opt-in.component.html',
  styleUrl: './push-opt-in.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PushOptInComponent {
  protected readonly facade = inject(NotificationFacade);

  protected message(): string {
    switch (this.facade.pushOptInState()) {
      case 'denied': return 'Notificările sunt blocate. Le poți activa din setările browserului.';
      case 'unsupported': return 'Browserul tău nu acceptă notificări push.';
      case 'ios-not-installed': return 'Pe iPhone, instalează NovaFit pe ecranul principal pentru notificări.';
      case 'configuration-missing': return 'Notificările push nu sunt configurate încă.';
      case 'error': return 'Nu am putut activa notificările. Încearcă din nou mai târziu.';
      case 'subscribed': return 'Notificările sunt active.';
      default: return 'Primește reminder-e și actualizări importante de la NovaFit.';
    }
  }

  protected canEnable(): boolean {
    return this.facade.pushOptInState() === 'idle' || this.facade.pushOptInState() === 'error';
  }
}
