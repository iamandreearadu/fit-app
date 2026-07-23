import { EnvironmentProviders, Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';
import { provideServiceWorker } from '@angular/service-worker';

/** Common infrastructure required by standalone component smoke tests. */
export const TEST_PROVIDERS: Array<Provider | EnvironmentProviders> = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
  provideNoopAnimations(),
  provideToastr(),
  provideServiceWorker('ngsw-worker.js', { enabled: false }),
];
