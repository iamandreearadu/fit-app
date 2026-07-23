import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, exhaustMap, from } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly snackBar = inject(MatSnackBar);

  constructor() {
    if (!this.updates.isEnabled) return;

    this.updates.versionUpdates.pipe(
      filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
      exhaustMap(() => this.snackBar.open(
        'Versiune nouă disponibilă',
        'Reîncarcă',
        { panelClass: ['pwa-update-snackbar'], duration: 0 },
      ).onAction()),
      exhaustMap(() => from(this.updates.activateUpdate())),
      takeUntilDestroyed(),
    ).subscribe(() => window.location.reload());
  }
}
