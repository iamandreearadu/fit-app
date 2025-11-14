import { Injectable } from '@angular/core';
import { ToastrService, IndividualConfig } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private defaultConfig: Partial<IndividualConfig> = {
    timeOut: 4000,
    progressBar: true,
    enableHtml: false,
    closeButton: true
  };

  constructor(private toastr: ToastrService) {}

  success(message: string, title?: string, config?: Partial<IndividualConfig>) {
    this.toastr.success(message, title ?? 'Success', { ...this.defaultConfig, ...config });
  }

  info(message: string, title?: string, config?: Partial<IndividualConfig>) {
    this.toastr.info(message, title ?? 'Info', { ...this.defaultConfig, ...config });
  }

  warn(message: string, title?: string, config?: Partial<IndividualConfig>) {
    this.toastr.warning(message, title ?? 'Warning', { ...this.defaultConfig, ...config });
  }

  error(message: string, title?: string, config?: Partial<IndividualConfig>) {
    this.toastr.error(message, title ?? 'Error', { ...this.defaultConfig, ...config });
  }

  apiError(err: unknown, title?: string) {
    const message = typeof err === 'string' ? err : (err && (err as any).message) || 'An unexpected error occurred';
    this.error(message, title ?? 'API Error');
  }
}
