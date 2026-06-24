import { Directive, ElementRef, output, HostListener, inject } from '@angular/core';

/**
 * Emits (clickOutside) when a document click lands outside the host element.
 *
 * Apply it only on elements that are rendered conditionally (e.g. inside @if).
 * The HostListener is created/destroyed with the directive, so zero listeners
 * exist when the host element is not in the DOM.
 *
 * Usage:
 *   @if (showMenu()) {
 *     <div class="menu" appClickOutside (clickOutside)="showMenu.set(false)">
 *       ...
 *     </div>
 *   }
 *
 * The toggle button must call event.stopPropagation() so the document listener
 * that was just attached does not immediately close the newly-opened menu.
 */
@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  readonly clickOutside = output<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (target instanceof Node && !this.el.nativeElement.contains(target)) {
      this.clickOutside.emit();
    }
  }
}
