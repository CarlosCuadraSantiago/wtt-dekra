import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserCard } from '../components/user-card/user-card';
import { UserForm } from '../components/user-form/user-form';
import type { User, UserInput } from '../models/user.model';
import { UsersService } from '../services/users.service';

@Component({
  imports: [MatButtonModule, MatCardModule, MatIconModule, RouterLink, UserCard, UserForm],
  selector: 'app-users-create',
  styleUrl: './users-create.scss',
  templateUrl: './users-create.html',
})
export class UsersCreate {
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private readonly previewInput = signal<UserInput>({
    username: '',
    name: '',
    surnames: '',
    email: '',
    password: '',
    age: 18,
    active: true,
  });

  readonly previewUser = computed<User>(() => {
    const i = this.previewInput();
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
  });

  onValueChange(input: UserInput): void {
    this.previewInput.set(input);
  }

  async onSubmit(input: UserInput): Promise<void> {
    try {
      await this.usersService.create(input);
      this.snackBar.open('User created successfully', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack--success'],
      });
      await this.router.navigate(['/users']);
    } catch {
      this.snackBar.open('Failed to create user', 'Close', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack--error'],
      });
    }
  }
}
