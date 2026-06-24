import { inject, Injectable } from '@angular/core';
import { ToastrService, IndividualConfig } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private defaultConfig: Partial<IndividualConfig> = {
    timeOut: 4000,
    progressBar: true,
    enableHtml: false,
    closeButton: true
  };
  private toastr = inject(ToastrService);

  /** Returns true when the viewport matches a mobile breakpoint (≤ 768px).
   *  Checked at call-time via matchMedia — no subscription needed. */
  private isMobile(): boolean {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  success(message: string, title?: string, config?: Partial<IndividualConfig>) {
    if (this.isMobile()) return;
    this.toastr.success(message, title ?? 'Success', { ...this.defaultConfig, ...config });
  }

  info(message: string, title?: string, config?: Partial<IndividualConfig>) {
    if (this.isMobile()) return;
    this.toastr.info(message, title ?? 'Info', { ...this.defaultConfig, ...config });
  }

  warn(message: string, title?: string, config?: Partial<IndividualConfig>) {
    if (this.isMobile()) return;
    this.toastr.warning(message, title ?? 'Warning', { ...this.defaultConfig, ...config });
  }

  error(message: string, title?: string, config?: Partial<IndividualConfig>) {
    if (this.isMobile()) return;
    this.toastr.error(message, title ?? 'Error', { ...this.defaultConfig, ...config });
  }

  apiError(err: unknown, title?: string) {
    const message = typeof err === 'string' ? err : (err && (err as any).message) || 'An unexpected error occurred';
    this.error(message, title ?? 'API Error');
  }
}
