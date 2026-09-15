import { AfterViewInit, ChangeDetectorRef, Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmDeleteDialog } from '../components/confirm-delete-dialog/confirm-delete-dialog';
import type { User } from '../models/user.model';
import { UsersService } from '../services/users.service';

@Component({
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatTableModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  selector: 'app-users-list',
  styleUrl: './users-list.scss',
  templateUrl: './users-list.html',
})
export class UsersList implements OnInit, AfterViewInit {
  readonly displayedColumns = ['username', 'name', 'surnames', 'email', 'age', 'active', 'actions'];
  readonly dataSource = new MatTableDataSource<User>([]);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly deletingId = signal<number | null>(null);

  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data: User, filter: string) => {
      const haystack = `${data.username} ${data.name} ${data.surnames} ${data.email}`.toLowerCase();
      return haystack.includes(filter);
    };

    this.usersService.list().then((users) => {
      this.dataSource.data = users;
      this.cdr.markForCheck();
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.dataSource.filter = term.trim().toLowerCase();
        if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
        }
      });
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
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
    try {
      await this.usersService.delete(user.id);
      this.dataSource.data = this.dataSource.data.filter((u) => u.id !== user.id);
      this.snackBar.open(`User ${user.username} deleted`, 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack--success'],
      });
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
}
