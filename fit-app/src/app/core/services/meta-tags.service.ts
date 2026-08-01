import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

interface RouteMeta {
  title: string;
  description: string;
  index: boolean;
}

const DEFAULT_META: RouteMeta = {
  title: 'NovaFit — Fitness, Nutrition & Progress',
  description: 'Track workouts, meals, hydration and progress with AI-assisted nutrition insights and a supportive fitness community.',
  index: true,
};

/**
 * Keeps document, Open Graph and Twitter metadata in sync with SPA navigation.
 * Authenticated product screens are intentionally excluded from search indexes.
 */
@Injectable({ providedIn: 'root' })
export class MetaTagsService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  constructor() {
    this.applyForCurrentRoute();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.applyForCurrentRoute());
  }

  private applyForCurrentRoute(): void {
    const leaf = this.deepestRoute(this.router.routerState.snapshot.root);
    const routeMeta = leaf.data['meta'] as Partial<RouteMeta> | undefined;
    const path = this.router.url.split(/[?#]/, 1)[0];
    const index = routeMeta?.index ?? this.isPublicIndexablePath(path);
    const values: RouteMeta = {
      title: routeMeta?.title ?? DEFAULT_META.title,
      description: routeMeta?.description ?? DEFAULT_META.description,
      index,
    };

    this.title.setTitle(values.title);
    this.updateName('description', values.description);
    this.updateName('robots', values.index
      ? 'index, follow, max-image-preview:large'
      : 'noindex, nofollow');
    this.updateProperty('og:title', values.title);
    this.updateProperty('og:description', values.description);
    if (values.index) {
      const canonicalUrl = new URL(path || '/', this.document.location.origin).href;
      this.updateProperty('og:url', canonicalUrl);
      this.setCanonical(canonicalUrl);
    } else {
      this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.remove();
      this.meta.removeTag('property="og:url"');
    }
  }

  private deepestRoute(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    let current = route;
    while (current.firstChild) current = current.firstChild;
    return current;
  }

  private isPublicIndexablePath(path: string): boolean {
    return path === ''
      || path === '/'
      || path === '/blog'
      || path.startsWith('/blog/')
      || path === '/privacy'
      || path === '/terms'
      || path === '/cookies';
  }

  private updateName(name: string, content: string): void {
    this.meta.updateTag({ name, content }, `name="${name}"`);
  }

  private updateProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property="${property}"`);
  }

  private setCanonical(href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = href;
  }
}
