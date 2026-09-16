import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import type { User } from '../../models/user.model';

@Component({
  imports: [MatButtonModule, MatCardModule, MatIconModule, RouterLink, TranslocoDirective],
  selector: 'app-user-card',
  styleUrl: './user-card.scss',
  templateUrl: './user-card.html',
})
export class UserCard {
  readonly user = input.required<User>();
  readonly mode = input.required<'update' | 'delete' | 'preview' | 'manage'>();
  readonly deleting = input<boolean>(false);
  readonly deleteRequested = output<User>();
  readonly editRequested = output<User>();
}
