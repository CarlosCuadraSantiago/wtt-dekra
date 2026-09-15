import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserCard } from '../components/user-card/user-card';
import { UserForm } from '../components/user-form/user-form';
import type { User, UserInput } from '../models/user.model';
import { UsersService } from '../services/users.service';

@Component({
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, RouterLink, UserCard, UserForm],
  selector: 'app-users-edit',
  styleUrl: './users-edit.scss',
  templateUrl: './users-edit.html',
})
export class UsersEdit implements OnInit {
  user: User | null = null;
  notFound = false;
  loading = true;

  private readonly previewInput = signal<UserInput | null>(null);

  readonly previewUser = computed<User | null>(() => {
    const base = this.user;
    const input = this.previewInput();
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
      // keep original lastLogin/createdAt/password
    };
  });

  private readonly usersService = inject(UsersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (Number.isNaN(id)) {
      this.notFound = true;
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    this.usersService.find(id).then((found) => {
      if (!found) {
        this.notFound = true;
      } else {
        this.user = found;
        this.previewInput.set({
          username: found.username,
          name: found.name,
          surnames: found.surnames,
          email: found.email,
          password: '',
          age: found.age,
          active: found.active,
        });
      }
      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  onValueChange(input: UserInput): void {
    this.previewInput.set(input);
  }

  async onSubmit(input: UserInput): Promise<void> {
    const current = this.user;
    if (!current) return;
    try {
      await this.usersService.update(current.id, input);
      this.snackBar.open('User updated successfully', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack--success'],
      });
      await this.router.navigate(['/users']);
    } catch {
      this.snackBar.open('Failed to update user', 'Close', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack--error'],
      });
    }
  }
}
