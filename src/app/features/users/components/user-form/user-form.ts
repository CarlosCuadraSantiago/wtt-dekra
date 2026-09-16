import { Component, Injector, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { form } from '@angular/forms/signals';
import type { FieldTree } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { UsersService } from '../../services/users.service';
import type { User, UserInput } from '../../models/user.model';
import { userFormSchema } from '../../schemas/user-form.schema';
import { generateUsername } from '../../utils/username.util';

@Component({
  imports: [FormField, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, TranslocoDirective],
  selector: 'app-user-form',
  styleUrl: './user-form.scss',
  templateUrl: './user-form.html',
})
export class UserForm implements OnInit {
  readonly initialUser = input<User | null>(null);
  readonly submitLabel = input<string>('Save user');
  readonly submitted = output<UserInput>();
  readonly valueChange = output<UserInput>();

  private readonly emptyModel: UserInput = {
    username: '',
    name: '',
    surnames: '',
    email: '',
    password: '',
    age: 18,
    active: true,
  };

  private readonly model = signal<UserInput>({ ...this.emptyModel });
  private readonly injector = inject(Injector);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);
  private readonly usersService = inject(UsersService);
  private readonly existingUsernames = signal<string[]>([]);
  private initialUsername: string | null = null;

  userForm!: FieldTree<UserInput>;

  ngOnInit(): void {
    const user = this.initialUser();
    if (user) {
      this.initialUsername = user.username;
      this.model.set({
        username: user.username,
        name: user.name,
        surnames: user.surnames,
        email: user.email,
        password: '',
        age: user.age,
        active: user.active,
      });
    }
    const requirePassword = user === null;
    this.userForm = form(this.model, userFormSchema(requirePassword), { injector: this.injector });

    this.usersService.list().then((users) => {
      this.existingUsernames.set(users.map((u) => u.username.toLowerCase()));
    });

    // Autogenera el nombre de usuario a partir del nombre y apellidos (minúsculas, primer apellido, respaldo al segundo si hay colisión)
    effect(
      () => {
        const { name, surnames, username } = this.model();
        const existing = this.existingUsernames();
        const generated = generateUsername(name, surnames, existing, this.initialUsername);
        if (generated !== username) {
          this.model.update((m) => ({ ...m, username: generated }));
        }
      },
      { injector: this.injector },
    );

    // Vista previa en vivo: emite en cada cambio del modelo
    effect(
      () => {
        const value = this.model();
        // emite una copia superficial para evitar sorpresas por mutación
        this.valueChange.emit({ ...value });
      },
      { injector: this.injector },
    );
  }

  onSubmit(): void {
    const tree = this.userForm;
    tree().markAsTouched();
    if (!tree().valid()) {
      this.snackBar.open(this.transloco.translate('userForm.formError'), this.transloco.translate('common.close'), {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['snack--error'],
      });
      return;
    }
    const value = tree().value();
    // En edición, omite la contraseña vacía para que el servicio conserve la existente
    if (this.initialUser() && !value.password) {
      const { password: _omit, ...rest } = value;
      this.submitted.emit(rest as UserInput);
      return;
    }
    this.submitted.emit(value);
  }

  onClear(): void {
    const user = this.initialUser();
    if (user) {
      this.model.set({
        username: user.username,
        name: user.name,
        surnames: user.surnames,
        email: user.email,
        password: '',
        age: user.age,
        active: user.active,
      });
    } else {
      this.model.set({ ...this.emptyModel });
    }
    this.userForm().reset(this.model());
  }
}
