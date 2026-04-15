import {
  ApplicationConfig,
  provideZoneChangeDetection,
  importProvidersFrom,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
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

import { routes } from './app.routes';
import { AccountFacade } from './core/facade/account.facade';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
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
