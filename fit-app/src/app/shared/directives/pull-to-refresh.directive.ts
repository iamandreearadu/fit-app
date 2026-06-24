import {
  Directive, Input, Output, EventEmitter, HostListener,
  Renderer2, ElementRef, inject, OnDestroy
} from '@angular/core';

type PtrPhase = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'completing';

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true,
  exportAs: 'appPullToRefresh',
})
export class PullToRefreshDirective implements OnDestroy {
  @Input() ptrThreshold = 64;
  @Output() refresh = new EventEmitter<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  private phase: PtrPhase = 'idle';
  private startY = 0;
  private indicator: HTMLElement | null = null;

  private isDesktop(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  }

  @HostListener('pointerdown', ['$event'])
  onDown(e: PointerEvent): void {
    if (this.isDesktop() || this.phase === 'refreshing') return;
    this.startY = e.clientY;
  }

  @HostListener('pointermove', ['$event'])
  onMove(e: PointerEvent): void {
    if (this.isDesktop() || this.phase === 'refreshing') return;
    if (this.el.nativeElement.scrollTop > 0) return;
    const delta = e.clientY - this.startY;
    if (delta <= 0) return;
    e.preventDefault();
    const dist = Math.min(delta, this.ptrThreshold * 1.5);
    if (!this.indicator) this.createIndicator();
    this.updateIndicator(dist);
    this.renderer.setStyle(this.el.nativeElement, 'transform', `translateY(${dist * 0.4}px)`);
    this.phase = dist >= this.ptrThreshold ? 'ready' : 'pulling';
  }

  @HostListener('pointerup')
  onUp(): void {
    if (this.isDesktop()) return;
    if (this.phase === 'ready') this.startRefreshing();
    else if (this.phase === 'pulling') this.abort();
  }

  @HostListener('pointercancel')
  onCancel(): void { if (this.phase !== 'refreshing') this.abort(); }

  complete(): void {
    this.phase = 'completing';
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 200ms ease-out');
    this.renderer.setStyle(this.el.nativeElement, 'transform', 'translateY(0)');
    if (this.indicator) {
      this.renderer.setStyle(this.indicator, 'transition', 'opacity 200ms ease-out');
      this.renderer.setStyle(this.indicator, 'opacity', '0');
    }
    setTimeout(() => this.resetAll(), 250);
  }

  private startRefreshing(): void {
    this.phase = 'refreshing';
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 200ms ease-out');
    this.renderer.setStyle(this.el.nativeElement, 'transform', 'translateY(56px)');
    if (this.indicator) {
      const icon = this.indicator.querySelector('.ptr-icon') as HTMLElement | null;
      if (icon) this.renderer.setStyle(icon, 'display', 'none');
      const spinner = this.indicator.querySelector('.ptr-spinner') as HTMLElement | null;
      if (spinner) this.renderer.setStyle(spinner, 'display', 'flex');
      this.renderer.addClass(this.indicator, 'ptr-indicator--refreshing');
    }
    this.refresh.emit();
  }

  private abort(): void {
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 200ms var(--nova-ease-spring)');
    this.renderer.setStyle(this.el.nativeElement, 'transform', 'translateY(0)');
    if (this.indicator) {
      this.renderer.setStyle(this.indicator, 'opacity', '0');
      this.renderer.setStyle(this.indicator, 'transform', 'translateX(-50%) translateY(-48px)');
    }
    setTimeout(() => this.resetAll(), 250);
  }

  private updateIndicator(dist: number): void {
    if (!this.indicator) return;
    const ty = -48 + (dist / this.ptrThreshold) * 48;
    const opacity = Math.min(dist / this.ptrThreshold, 1);
    this.renderer.setStyle(this.indicator, 'transform', `translateX(-50%) translateY(${ty}px)`);
    this.renderer.setStyle(this.indicator, 'opacity', String(opacity));
    const icon = this.indicator.querySelector('.ptr-icon') as HTMLElement | null;
    if (icon) this.renderer.setStyle(icon, 'transform', `rotate(${(dist / this.ptrThreshold) * 180}deg)`);
    if (dist >= this.ptrThreshold) this.renderer.addClass(this.indicator, 'ptr-indicator--ready');
    else this.renderer.removeClass(this.indicator, 'ptr-indicator--ready');
  }

  private createIndicator(): void {
    const div = this.renderer.createElement('div') as HTMLElement;
    this.renderer.addClass(div, 'ptr-indicator');
    // Icon span
    const icon = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(icon, 'ptr-icon');
    this.renderer.addClass(icon, 'material-icons');
    this.renderer.setProperty(icon, 'textContent', 'expand_more');
    this.renderer.appendChild(div, icon);
    // Spinner span
    const spinner = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(spinner, 'ptr-spinner');
    this.renderer.setStyle(spinner, 'display', 'none');
    this.renderer.setProperty(spinner, 'textContent', '↻');
    this.renderer.appendChild(div, spinner);

    this.indicator = div;
    const parent = this.el.nativeElement.parentElement;
    if (parent) {
      this.renderer.setStyle(parent, 'position', 'relative');
      this.renderer.insertBefore(parent, div, this.el.nativeElement);
    }
  }

  private resetAll(): void {
    this.phase = 'idle';
    this.renderer.removeStyle(this.el.nativeElement, 'transform');
    this.renderer.removeStyle(this.el.nativeElement, 'transition');
    if (this.indicator) {
      this.renderer.removeChild(this.indicator.parentElement, this.indicator);
      this.indicator = null;
    }
  }

  ngOnDestroy(): void { this.resetAll(); }
}
