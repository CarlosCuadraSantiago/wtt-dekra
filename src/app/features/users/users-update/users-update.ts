import { AfterViewInit, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { UserCard } from '../components/user-card/user-card';
import type { User } from '../models/user.model';
import { UsersService } from '../services/users.service';

const PAGE_SIZE = 12;

@Component({
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, ReactiveFormsModule, UserCard],
  selector: 'app-users-update',
  styleUrl: './users-update.scss',
  templateUrl: './users-update.html',
})
export class UsersUpdate implements OnInit, AfterViewInit, OnDestroy {
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly loading = signal(true);
  private readonly allUsers = signal<User[]>([]);
  private readonly visibleCount = signal(PAGE_SIZE);
  private readonly searchTerm = signal('');

  private readonly usersService = inject(UsersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private observer?: IntersectionObserver;
  private scrollHandler?: () => void;

  @ViewChild('sentinel') sentinel?: ElementRef<HTMLElement>;

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const all = this.allUsers();
    if (!term) return all;
    return all.filter((u) => `${u.username} ${u.name} ${u.surnames} ${u.email}`.toLowerCase().includes(term));
  });

  readonly visibleUsers = computed(() => this.filteredUsers().slice(0, this.visibleCount()));
  readonly hasMore = computed(() => this.visibleCount() < this.filteredUsers().length);
  readonly totalCount = computed(() => this.filteredUsers().length);

  ngOnInit(): void {
    this.usersService.list().then((users) => {
      this.allUsers.set(users);
      this.loading.set(false);
      this.cdr.markForCheck();
      setTimeout(() => this.observeSentinel(), 0);
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.visibleCount.set(PAGE_SIZE);
        this.cdr.markForCheck();
        setTimeout(() => this.observeSentinel(), 0);
      });
  }

  ngAfterViewInit(): void {
    // initial observe deferred until data loaded; keep for search reset
    this.observeSentinel();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.scrollHandler) {
      this.getScrollRoot()?.removeEventListener('scroll', this.scrollHandler);
    }
  }

  loadMore(): void {
    if (!this.hasMore()) return;
    this.visibleCount.update((c) => Math.min(c + PAGE_SIZE, this.filteredUsers().length));
    this.cdr.markForCheck();
    // sentinel moves down after new cards rendered – defer until DOM updates (zoneless: macrotask)
    setTimeout(() => this.observeSentinel(), 0);
  }

  private getScrollRoot(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return (document.querySelector('.layout__main') as HTMLElement | null) ?? (document.querySelector('.mat-sidenav-content') as HTMLElement | null);
  }

  private observeSentinel(): void {
    this.observer?.disconnect();
    const el = this.sentinel?.nativeElement;
    if (!el) {
      // zoneless: DOM aún no renderizado tras markForCheck → reintenta en siguiente frame
      if (!this.loading() && typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => this.observeSentinel());
      } else {
        setTimeout(() => this.observeSentinel(), 50);
      }
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      // fallback: check on scroll
      const root = this.getScrollRoot();
      if (root) {
        const onScroll = () => {
          const rect = el.getBoundingClientRect();
          const rootRect = root.getBoundingClientRect();
          if (rect.top < rootRect.bottom + 200 && this.hasMore()) {
            this.loadMore();
          }
          if (!this.hasMore()) root.removeEventListener('scroll', onScroll);
        };
        this.scrollHandler = onScroll;
        root.addEventListener('scroll', onScroll, { passive: true });
        this.destroyRef.onDestroy(() => root.removeEventListener('scroll', onScroll));
      }
      return;
    }
    // Use the sidenav content as root so scrolling inside layout triggers
    const root = this.getScrollRoot();
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && this.hasMore()) {
            this.loadMore();
          }
        }
      },
      { root: root ?? null, rootMargin: '200px', threshold: 0 },
    );
    this.observer.observe(el);
  }
}
