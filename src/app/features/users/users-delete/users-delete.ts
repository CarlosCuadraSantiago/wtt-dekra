import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmDeleteDialog } from '../components/confirm-delete-dialog/confirm-delete-dialog';
import { UserCard } from '../components/user-card/user-card';
import type { User } from '../models/user.model';
import { UsersService } from '../services/users.service';

const PAGE_SIZE = 12;

@Component({
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, ReactiveFormsModule, UserCard],
  selector: 'app-users-delete',
  styleUrl: './users-delete.scss',
  templateUrl: './users-delete.html',
})
export class UsersDelete implements OnInit, AfterViewInit, OnDestroy {
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly loading = signal(true);
  readonly deletingId = signal<number | null>(null);

  private readonly allUsers = signal<User[]>([]);
  private readonly visibleCount = signal(PAGE_SIZE);
  private readonly searchTerm = signal('');

  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
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
      queueMicrotask(() => this.observeSentinel());
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.visibleCount.set(PAGE_SIZE);
        queueMicrotask(() => this.observeSentinel());
      });
  }

  ngAfterViewInit(): void {
    this.observeSentinel();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.scrollHandler) {
      this.getScrollRoot()?.removeEventListener('scroll', this.scrollHandler);
    }
  }

  confirmDelete(user: User): void {
    const ref = this.dialog.open(ConfirmDeleteDialog, {
      data: { user },
      width: '420px',
      disableClose: false,
      autoFocus: 'dialog',
    });

    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed: boolean | undefined) => {
        if (confirmed) {
          void this.deleteUser(user);
        }
      });
  }

  private async deleteUser(user: User): Promise<void> {
    this.deletingId.set(user.id);
    try {
      await this.usersService.delete(user.id);
      this.allUsers.update((all) => all.filter((u) => u.id !== user.id));
      // adjust visibleCount if needed
      if (this.visibleCount() > this.filteredUsers().length) {
        this.visibleCount.set(this.filteredUsers().length);
      }
      this.snackBar.open(`User ${user.username} deleted`, 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack--success'],
      });
      queueMicrotask(() => this.observeSentinel());
    } catch {
      this.snackBar.open('Failed to delete user', 'Close', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack--error'],
      });
    } finally {
      this.deletingId.set(null);
    }
  }

  loadMore(): void {
    if (!this.hasMore()) return;
    this.visibleCount.update((c) => Math.min(c + PAGE_SIZE, this.filteredUsers().length));
    queueMicrotask(() => this.observeSentinel());
  }

  private getScrollRoot(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return (document.querySelector('.layout__main') as HTMLElement | null) ?? (document.querySelector('.mat-sidenav-content') as HTMLElement | null);
  }

  private observeSentinel(): void {
    this.observer?.disconnect();
    const el = this.sentinel?.nativeElement;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
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
