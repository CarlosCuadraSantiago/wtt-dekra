import { email, max, maxLength, min, minLength, pattern, required } from '@angular/forms/signals';
import type { SchemaOrSchemaFn } from '@angular/forms/signals';
import type { UserInput } from '../models/user.model';

export const USERNAME_PATTERN = /^[a-z][a-z0-9._-]*$/i;

export function userFormSchema(requirePassword: boolean): SchemaOrSchemaFn<UserInput> {
  return (field) => {
    required(field.username, { message: 'Username is required' });
    pattern(field.username, USERNAME_PATTERN, {
      message: 'Use letters, numbers, dot, dash or underscore (start with letter)',
    });
    maxLength(field.username, 20, { message: 'Username must be at most 20 characters' });

    required(field.name, { message: 'Name is required' });
    maxLength(field.name, 50, { message: 'Name must be at most 50 characters' });

    required(field.surnames, { message: 'Surnames are required' });
    maxLength(field.surnames, 100, { message: 'Surnames must be at most 100 characters' });

    required(field.email, { message: 'Email is required' });
    email(field.email, { message: 'Enter a valid email address' });

    if (requirePassword) {
      required(field.password, { message: 'Password is required' });
      minLength(field.password, 8, { message: 'Password must be at least 8 characters' });
    } else {
      minLength(
        field.password,
        (ctx) => (ctx.valueOf(field.password) ? 8 : undefined),
        { message: 'Password must be at least 8 characters' },
      );
    }

    required(field.age, { message: 'Age is required' });
    min(field.age, 18, { message: 'Age must be at least 18' });
    max(field.age, 120, { message: 'Age must be at most 120' });
  };
}
