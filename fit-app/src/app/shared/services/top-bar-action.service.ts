import { Injectable, signal } from '@angular/core';

export interface TopBarAction {
  id: string;
  icon: string;
  ariaLabel: string;
  run: () => void;
}

@Injectable({ providedIn: 'root' })
export class TopBarActionService {
  readonly action = signal<TopBarAction | null>(null);

  set(action: TopBarAction): void {
    this.action.set(action);
  }

  clear(id: string): void {
    if (this.action()?.id === id) this.action.set(null);
  }

  trigger(): void {
    this.action()?.run();
  }
}
