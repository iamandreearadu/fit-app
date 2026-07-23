import {
  ApplicationConfig,
  provideZoneChangeDetection,
  importProvidersFrom,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import {
  Chart,
  LineElement,
  LinearScale,
  CategoryScale,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(LineElement, LinearScale, CategoryScale, PointElement, Filler, Tooltip, Legend);

import { MaterialModule } from './core/material/material.module';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { zoneFixInterceptor } from './core/interceptors/zone-fix.interceptor';

import { routes } from './app.routes';
import { AccountFacade } from './core/facade/account.facade';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(withInterceptors([zoneFixInterceptor, authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),
    importProvidersFrom(
      BrowserAnimationsModule,
      ToastrModule.forRoot({
        positionClass: 'toast-bottom-right',
        closeButton: true,
      }),
      MaterialModule,
    ),
    provideAppInitializer(() => {
      const accountFacade = inject(AccountFacade);
      return accountFacade.init();
    }),
  ],
};
