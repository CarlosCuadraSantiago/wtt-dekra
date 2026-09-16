import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoDirective } from '@jsverse/transloco';
import type { User } from '../../models/user.model';

@Component({
  imports: [MatButtonModule, MatDialogModule, MatIconModule, TranslocoDirective],
  selector: 'app-confirm-delete-dialog',
  styleUrl: './confirm-delete-dialog.scss',
  templateUrl: './confirm-delete-dialog.html',
})
export class ConfirmDeleteDialog {
  readonly data: { user: User } = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDeleteDialog>);

  close(confirmed: boolean): void {
    this.dialogRef.close(confirmed);
  }
}
