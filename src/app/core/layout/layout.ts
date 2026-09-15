import { NgOptimizedImage } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

const DESKTOP_QUERY = '(min-width: 779px)';

@Component({
  selector: 'app-layout',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    NgOptimizedImage,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  styleUrl: './layout.scss',
  templateUrl: './layout.html',
})
export class Layout {
  private readonly themeKey = 'wtt-dekra:theme';
  readonly isDesktop = signal(true);
  readonly sidebarOpened = signal(true);
  readonly isDarkMode = signal(this.readTheme());

  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.breakpoints
      .observe(DESKTOP_QUERY)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ matches }) => {
        this.isDesktop.set(matches);
        this.sidebarOpened.set(matches);
      });

    effect(() => {
      const isDark = this.isDarkMode();
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark-theme', isDark);
      }
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(this.themeKey, isDark ? 'dark' : 'light');
        } catch {
          // storage unavailable
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
      // ignore
    }
    return false;
  }

  toggleTheme(): void {
    this.isDarkMode.update((v) => !v);
  }

  toggleSidebar(): void {
    this.sidebarOpened.update((v) => !v);
  }
}
