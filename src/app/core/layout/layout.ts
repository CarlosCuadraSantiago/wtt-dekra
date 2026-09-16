import { NgOptimizedImage } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

const DESKTOP_QUERY = '(min-width: 779px)';

@Component({
  selector: 'app-layout',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    NgOptimizedImage,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslocoDirective,
  ],
  styleUrl: './layout.scss',
  templateUrl: './layout.html',
})
export class Layout {
  private readonly themeKey = 'wtt-dekra:theme';
  private readonly langKey = 'wtt-dekra:lang';
  readonly isDesktop = signal(true);
  readonly sidebarOpened = signal(true);
  readonly isDarkMode = signal(this.readTheme());
  readonly activeLang = signal(this.readLang());

  readonly langFlagSrc = computed(() => (this.activeLang() === 'es' ? 'flags/es.svg' : 'flags/gb.svg'));
  readonly langFlagAlt = computed(() => (this.activeLang() === 'es' ? 'España' : 'United Kingdom'));
  readonly langLabel = computed(() => (this.activeLang() === 'es' ? 'ES' : 'EN'));

  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    this.breakpoints
      .observe(DESKTOP_QUERY)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ matches }) => {
        this.isDesktop.set(matches);
        this.sidebarOpened.set(matches);
      });

    // inicializa el idioma desde el almacenamiento
    const initial = this.activeLang();
    this.transloco.setActiveLang(initial);

    effect(() => {
      const isDark = this.isDarkMode();
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark-theme', isDark);
      }
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(this.themeKey, isDark ? 'dark' : 'light');
        } catch {
          // almacenamiento no disponible
        }
      }
    });

    effect(() => {
      const lang = this.activeLang();
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(this.langKey, lang);
        } catch {
          // ignorar
        }
      }
    });
  }

  private readTheme(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const raw = localStorage.getItem(this.themeKey);
      if (raw === 'dark' || raw === 'true') return true;
      if (raw === 'light' || raw === 'false') return false;
    } catch {
      // ignorar
    }
    return false;
  }

  private readLang(): string {
    if (typeof localStorage === 'undefined') return 'en';
    try {
      const raw = localStorage.getItem(this.langKey);
      if (raw === 'es' || raw === 'en') return raw;
    } catch {
      // ignorar
    }
    return 'en';
  }

  toggleTheme(): void {
    this.isDarkMode.update((v) => !v);
  }

  setLang(lang: string): void {
    if (lang !== 'en' && lang !== 'es') return;
    this.activeLang.set(lang);
    this.transloco.setActiveLang(lang);
  }

  toggleSidebar(): void {
    this.sidebarOpened.update((v) => !v);
  }
}
