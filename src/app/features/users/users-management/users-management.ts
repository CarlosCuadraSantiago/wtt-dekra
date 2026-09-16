import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { gsap } from 'gsap';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ConfirmDeleteDialog } from '../components/confirm-delete-dialog/confirm-delete-dialog';
import { UserCard } from '../components/user-card/user-card';
import { UserForm } from '../components/user-form/user-form';
import type { User, UserInput } from '../models/user.model';
import { UsersService } from '../services/users.service';

const PAGE_SIZE = 12;
const VIEW_MODE_KEY = 'wtt-dekra:usersViewMode';

@Component({
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    ReactiveFormsModule,
    TranslocoDirective,
    UserCard,
    UserForm,
  ],
  selector: 'app-users-management',
  styleUrl: './users-management.scss',
  templateUrl: './users-management.html',
})
export class UsersManagement implements OnInit, AfterViewInit, OnDestroy {
  readonly displayedColumns = ['username', 'name', 'surnames', 'email', 'age', 'active', 'actions'];
  readonly dataSource = new MatTableDataSource<User>([]);
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly viewState = signal<'list' | 'create' | 'edit'>('list');
  readonly viewMode = signal<'table' | 'cards'>(this.readViewMode());
  readonly loading = signal(true);
  readonly deletingId = signal<number | null>(null);
  readonly editingUser = signal<User | null>(null);
  readonly isFormAnimating = signal(false);

  private readonly allUsers = signal<User[]>([]);
  private readonly visibleCount = signal(PAGE_SIZE);
  private readonly searchTerm = signal('');
  private readonly previewInput = signal<UserInput | null>(null);

  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly transloco = inject(TranslocoService);

  private observer?: IntersectionObserver;
  private scrollHandler?: () => void;

  private _paginator?: MatPaginator;
  @ViewChild(MatPaginator) set paginator(value: MatPaginator | undefined) {
    if (value) {
      this._paginator = value;
      // asegura paginador table 10 por página sin selector de Items per page
      value.pageSize = 10;
      this.dataSource.paginator = value;
      this.cdr.markForCheck();
    }
  }
  get paginator(): MatPaginator | undefined {
    return this._paginator;
  }
  @ViewChild('sentinel') sentinel?: ElementRef<HTMLElement>;
  @ViewChild('formContainer') formContainer?: ElementRef<HTMLElement>;
  @ViewChild('listContainer') listContainer?: ElementRef<HTMLElement>;

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const all = this.allUsers();
    if (!term) return all;
    return all.filter((u) => `${u.username} ${u.name} ${u.surnames} ${u.email}`.toLowerCase().includes(term));
  });

  readonly visibleUsers = computed(() => this.filteredUsers().slice(0, this.visibleCount()));
  readonly hasMore = computed(() => this.visibleCount() < this.filteredUsers().length);
  readonly totalCount = computed(() => this.filteredUsers().length);
  // Indica si el store está vacío (sin datos iniciales) — usado para deshabilitar buscador y switch
  readonly isEmpty = computed(() => this.allUsers().length === 0);

  readonly previewUser = computed<User | null>(() => {
    const state = this.viewState();
    const input = this.previewInput();
    if (state === 'create') {
      const i = input ?? { username: '', name: '', surnames: '', email: '', password: '', age: 18, active: true };
      return {
        id: 0,
        username: i.username.trim() || 'username',
        name: i.name.trim() || 'Name',
        surnames: i.surnames.trim() || 'Surnames',
        email: i.email.trim() || 'email@example.com',
        password: i.password,
        age: Number.isFinite(i.age) ? i.age : 18,
        active: i.active,
        lastLogin: null,
        createdAt: new Date(),
      };
    }
    if (state === 'edit') {
      const base = this.editingUser();
      if (!base) return null;
      if (!input) return base;
      return {
        ...base,
        username: input.username.trim() || base.username,
        name: input.name.trim() || base.name,
        surnames: input.surnames.trim() || base.surnames,
        email: input.email.trim() || base.email,
        age: Number.isFinite(input.age) ? input.age : base.age,
        active: input.active,
      };
    }
    return null;
  });

  constructor() {
    effect(() => {
      const mode = this.viewMode();
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(VIEW_MODE_KEY, mode);
        } catch {
          // ignorar
        }
      }
    });
    // Deshabilita buscador cuando no hay datos (store vacío) — se ejecuta cada que isEmpty cambia
    effect(() => {
      const empty = this.isEmpty();
      if (empty) {
        this.searchControl.disable({ emitEvent: false });
      } else {
        this.searchControl.enable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data: User, filter: string) => {
      const haystack = `${data.username} ${data.name} ${data.surnames} ${data.email}`.toLowerCase();
      return haystack.includes(filter);
    };

    this.usersService.list().then((users) => {
      this.allUsers.set(users);
      this.dataSource.data = users;
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
      this.loading.set(false);
      // Sincroniza estado disabled del buscador tras carga inicial
      if (users.length === 0) {
        this.searchControl.disable({ emitEvent: false });
      } else {
        this.searchControl.enable({ emitEvent: false });
      }
      this.cdr.markForCheck();
      setTimeout(() => this.observeSentinel(), 0);

      const idParam = this.route.snapshot.paramMap.get('id');
      if (idParam) {
        const id = Number(idParam);
        if (!Number.isNaN(id)) {
          const found = users.find((u) => u.id === id);
          if (found) {
            this.editingUser.set(found);
            this.previewInput.set({
              username: found.username,
              name: found.name,
              surnames: found.surnames,
              email: found.email,
              password: '',
              age: found.age,
              active: found.active,
            });
            this.viewState.set('edit');
            this.cdr.markForCheck();
            setTimeout(() => this.animateIn(), 0);
          } else {
            this.usersService.find(id).then((f) => {
              if (f) {
                this.editingUser.set(f);
                this.previewInput.set({
                  username: f.username,
                  name: f.name,
                  surnames: f.surnames,
                  email: f.email,
                  password: '',
                  age: f.age,
                  active: f.active,
                });
                this.viewState.set('edit');
                this.cdr.markForCheck();
                setTimeout(() => this.animateIn(), 0);
              }
            });
          }
        }
      }
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        const normalized = term.trim().toLowerCase();
        this.searchTerm.set(term);
        this.dataSource.filter = normalized;
        if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
        }
        this.visibleCount.set(PAGE_SIZE);
        this.cdr.markForCheck();
        setTimeout(() => this.observeSentinel(), 0);
      });
  }

  ngAfterViewInit(): void {
    if (this._paginator) {
      this.dataSource.paginator = this._paginator;
      this.cdr.markForCheck();
    }
    this.observeSentinel();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.scrollHandler) {
      this.getScrollRoot()?.removeEventListener('scroll', this.scrollHandler);
    }
  }

  setViewMode(mode: 'table' | 'cards'): void {
    this.viewMode.set(mode);
    this.visibleCount.set(PAGE_SIZE);
    this.cdr.markForCheck();
    setTimeout(() => {
      if (mode === 'table' && this._paginator) {
        this.dataSource.paginator = this._paginator;
        this.cdr.markForCheck();
      }
      this.observeSentinel();
    }, 0);
  }

  openCreate(): void {
    this.editingUser.set(null);
    this.previewInput.set({
      username: '',
      name: '',
      surnames: '',
      email: '',
      password: '',
      age: 18,
      active: true,
    });
    this.viewState.set('create');
    this.cdr.markForCheck();
    setTimeout(() => this.animateIn(), 0);
  }

  openEdit(user: User): void {
    this.editingUser.set(user);
    this.previewInput.set({
      username: user.username,
      name: user.name,
      surnames: user.surnames,
      email: user.email,
      password: '',
      age: user.age,
      active: user.active,
    });
    this.viewState.set('edit');
    this.cdr.markForCheck();
    setTimeout(() => this.animateIn(), 0);
  }

  closeForm(): void {
    this.animateOut(() => {
      this.viewState.set('list');
      this.editingUser.set(null);
      this.previewInput.set(null);
      this.cdr.markForCheck();
      setTimeout(() => this.observeSentinel(), 0);
    });
  }

  onValueChange(input: UserInput): void {
    this.previewInput.set(input);
  }

  async onSubmit(input: UserInput): Promise<void> {
    const state = this.viewState();
    try {
      if (state === 'create') {
        await this.usersService.create(input);
        this.snackBar.open(this.transloco.translate('usersManagement.snack.created'), this.transloco.translate('common.close'), {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['snack--success'],
        });
      } else if (state === 'edit') {
        const current = this.editingUser();
        if (!current) return;
        await this.usersService.update(current.id, input);
        this.snackBar.open(this.transloco.translate('usersManagement.snack.updated'), this.transloco.translate('common.close'), {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['snack--success'],
        });
      }
      const users = await this.usersService.list();
      this.allUsers.set(users);
      this.dataSource.data = users;
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
      // Habilita buscador/toggle si ahora hay datos
      if (users.length === 0) {
        this.searchControl.disable({ emitEvent: false });
      } else {
        this.searchControl.enable({ emitEvent: false });
      }
      this.animateOut(() => {
        this.viewState.set('list');
        this.editingUser.set(null);
        this.previewInput.set(null);
        this.cdr.markForCheck();
        setTimeout(() => this.observeSentinel(), 0);
      });
    } catch {
      this.snackBar.open(this.transloco.translate(state === 'create' ? 'usersManagement.snack.createFail' : 'usersManagement.snack.updateFail'), this.transloco.translate('common.close'), {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack--error'],
      });
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
        if (confirmed) void this.deleteUser(user);
      });
  }

  private async deleteUser(user: User): Promise<void> {
    this.deletingId.set(user.id);
    this.cdr.markForCheck();
    try {
      await this.usersService.delete(user.id);
      this.allUsers.update((all) => all.filter((u) => u.id !== user.id));
      this.dataSource.data = this.dataSource.data.filter((u) => u.id !== user.id);
      if (this.visibleCount() > this.filteredUsers().length) {
        this.visibleCount.set(this.filteredUsers().length);
      }
      // Si queda vacío, deshabilita buscador/toggle
      if (this.allUsers().length === 0) {
        this.searchControl.disable({ emitEvent: false });
      }
      this.cdr.markForCheck();
      this.snackBar.open(this.transloco.translate('usersManagement.snack.deleted', { username: user.username }), this.transloco.translate('common.close'), {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack--success'],
      });
      setTimeout(() => this.observeSentinel(), 0);
    } catch {
      this.snackBar.open(this.transloco.translate('usersManagement.snack.deleteFail'), this.transloco.translate('common.close'), {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack--error'],
      });
    } finally {
      this.deletingId.set(null);
      this.cdr.markForCheck();
    }
  }

  loadMore(): void {
    if (!this.hasMore()) return;
    this.visibleCount.update((c) => Math.min(c + PAGE_SIZE, this.filteredUsers().length));
    this.cdr.markForCheck();
    setTimeout(() => this.observeSentinel(), 0);
  }

  private readViewMode(): 'table' | 'cards' {
    if (typeof localStorage === 'undefined') return 'table';
    try {
      const raw = localStorage.getItem(VIEW_MODE_KEY);
      if (raw === 'cards' || raw === 'table') return raw;
    } catch {
      // ignorar
    }
    return 'table';
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private animateIn(): void {
    const el = this.formContainer?.nativeElement;
    if (!el) return;
    if (this.prefersReducedMotion()) return;
    this.isFormAnimating.set(true);
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { xPercent: -100, autoAlpha: 0 },
      {
        xPercent: 0,
        autoAlpha: 1,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: true,
        onComplete: () => this.isFormAnimating.set(false),
      },
    );
  }

  private animateOut(done: () => void): void {
    const el = this.formContainer?.nativeElement;
    if (!el) {
      done();
      return;
    }
    if (this.prefersReducedMotion()) {
      done();
      return;
    }
    this.isFormAnimating.set(true);
    gsap.killTweensOf(el);
    gsap.to(el, {
      xPercent: -100,
      autoAlpha: 0,
      duration: 0.28,
      ease: 'power2.in',
      overwrite: true,
      onComplete: () => {
        gsap.set(el, { clearProps: 'all' });
        this.isFormAnimating.set(false);
        done();
      },
    });
  }

  private getScrollRoot(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return (document.querySelector('.layout__main') as HTMLElement | null) ?? (document.querySelector('.mat-sidenav-content') as HTMLElement | null);
  }

  private observeSentinel(): void {
    this.observer?.disconnect();
    if (this.viewMode() !== 'cards' || this.viewState() !== 'list') return;
    const el = this.sentinel?.nativeElement;
    if (!el) {
      if (!this.loading() && typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => this.observeSentinel());
      } else {
        setTimeout(() => this.observeSentinel(), 50);
      }
      return;
    }
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
