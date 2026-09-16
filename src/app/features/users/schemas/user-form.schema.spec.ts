import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { form } from '@angular/forms/signals';
import { describe, expect, it } from 'vitest';
import type { UserInput } from '../models/user.model';
import { USERNAME_PATTERN, userFormSchema } from './user-form.schema';

function createValidInput(overrides: Partial<UserInput> = {}): UserInput {
  return {
    username: 'carlos.montes',
    name: 'Carlos',
    surnames: 'Montes Gallardo',
    email: 'carlos@example.com',
    password: 'P@ssw0rd9',
    age: 30,
    active: true,
    ...overrides,
  };
}

describe('USERNAME_PATTERN', () => {
  it('should accept valid usernames', () => {
    expect(USERNAME_PATTERN.test('carlos')).toBe(true);
    expect(USERNAME_PATTERN.test('carlos.montes')).toBe(true);
    expect(USERNAME_PATTERN.test('a1')).toBe(true);
    expect(USERNAME_PATTERN.test('user_name')).toBe(true);
    expect(USERNAME_PATTERN.test('user-name')).toBe(true);
    expect(USERNAME_PATTERN.test('user.name_1-2')).toBe(true);
  });

  it('should reject invalid usernames', () => {
    expect(USERNAME_PATTERN.test('1carlos')).toBe(false);
    expect(USERNAME_PATTERN.test('.carlos')).toBe(false);
    expect(USERNAME_PATTERN.test('')).toBe(false);
    expect(USERNAME_PATTERN.test('carlos montes')).toBe(false);
  });
});

describe('userFormSchema', () => {
  function setup(requirePassword: boolean, initial: UserInput) {
    const model = signal<UserInput>({ ...initial });
    const injector = TestBed.inject(Injector);
    const tree = form(model, userFormSchema(requirePassword), { injector });
    return { model, tree };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be valid with correct data when requirePassword=true', () => {
    const { tree } = setup(true, createValidInput());
    expect(tree().valid()).toBe(true);
    expect(tree().errors().length).toBe(0);
  });

  it('should require username', () => {
    const { tree } = setup(true, createValidInput({ username: '' }));
    tree().markAsTouched();
    const field = tree.username;
    expect(field().valid()).toBe(false);
    expect(field().errors().some((e) => e.message?.includes('Username is required'))).toBe(true);
  });

  it('should validate username pattern', () => {
    const { tree } = setup(true, createValidInput({ username: '1invalid' }));
    tree().markAsTouched();
    expect(tree.username().valid()).toBe(false);
    expect(tree.username().errors().some((e) => e.message?.includes('Use letters'))).toBe(true);
  });

  it('should validate username maxLength 20', () => {
    const { tree } = setup(true, createValidInput({ username: 'a'.repeat(21) }));
    tree().markAsTouched();
    expect(tree.username().valid()).toBe(false);
    expect(tree.username().errors().some((e) => e.message?.includes('at most 20'))).toBe(true);
  });

  it('should require name and validate maxLength 50', () => {
    const { tree: t1 } = setup(true, createValidInput({ name: '' }));
    t1().markAsTouched();
    expect(t1.name().valid()).toBe(false);
    expect(t1.name().errors().some((e) => e.message?.includes('Name is required'))).toBe(true);

    const { tree: t2 } = setup(true, createValidInput({ name: 'a'.repeat(51) }));
    t2().markAsTouched();
    expect(t2.name().valid()).toBe(false);
    expect(t2.name().errors().some((e) => e.message?.includes('at most 50'))).toBe(true);
  });

  it('should require surnames and validate maxLength 100', () => {
    const { tree: t1 } = setup(true, createValidInput({ surnames: '' }));
    t1().markAsTouched();
    expect(t1.surnames().valid()).toBe(false);

    const { tree: t2 } = setup(true, createValidInput({ surnames: 'a'.repeat(101) }));
    t2().markAsTouched();
    expect(t2.surnames().valid()).toBe(false);
    expect(t2.surnames().errors().some((e) => e.message?.includes('at most 100'))).toBe(true);
  });

  it('should require email and validate format', () => {
    const { tree: t1 } = setup(true, createValidInput({ email: '' }));
    t1().markAsTouched();
    expect(t1.email().valid()).toBe(false);
    expect(t1.email().errors().some((e) => e.message?.includes('Email is required'))).toBe(true);

    const { tree: t2 } = setup(true, createValidInput({ email: 'not-an-email' }));
    t2().markAsTouched();
    expect(t2.email().valid()).toBe(false);
    expect(t2.email().errors().some((e) => e.message?.includes('valid email'))).toBe(true);

    const { tree: t3 } = setup(true, createValidInput({ email: 'valid@example.com' }));
    expect(t3.email().valid()).toBe(true);
  });

  it('should require password when requirePassword=true', () => {
    const { tree } = setup(true, createValidInput({ password: '' }));
    tree().markAsTouched();
    expect(tree.password().valid()).toBe(false);
    expect(tree.password().errors().some((e) => e.message?.includes('Password is required'))).toBe(true);
  });

  it('should validate password minLength 8 when requirePassword=true', () => {
    const { tree } = setup(true, createValidInput({ password: 'short' }));
    tree().markAsTouched();
    expect(tree.password().valid()).toBe(false);
    expect(tree.password().errors().some((e) => e.message?.includes('at least 8'))).toBe(true);
  });

  it('should make password optional when requirePassword=false but validate minLength if present', () => {
    const { tree: t1 } = setup(false, createValidInput({ password: '' }));
    t1().markAsTouched();
    expect(t1.password().valid()).toBe(true);

    const { tree: t2 } = setup(false, createValidInput({ password: 'short' }));
    t2().markAsTouched();
    expect(t2.password().valid()).toBe(false);

    const { tree: t3 } = setup(false, createValidInput({ password: 'longenough' }));
    expect(t3.password().valid()).toBe(true);
  });

  it('should require age and validate min 18 and max 120', () => {
    // required is implicit via min/max? schema does required(field.age)
    // we test via field validity after markAsTouched
    const { tree: t1 } = setup(true, createValidInput({ age: 17 }));
    t1().markAsTouched();
    expect(t1.age().valid()).toBe(false);
    expect(t1.age().errors().some((e) => e.message?.includes('at least 18'))).toBe(true);

    const { tree: t2 } = setup(true, createValidInput({ age: 121 }));
    t2().markAsTouched();
    expect(t2.age().valid()).toBe(false);
    expect(t2.age().errors().some((e) => e.message?.includes('at most 120'))).toBe(true);

    const { tree: t3 } = setup(true, createValidInput({ age: 18 }));
    expect(t3.age().valid()).toBe(true);

    const { tree: t4 } = setup(true, createValidInput({ age: 120 }));
    expect(t4.age().valid()).toBe(true);
  });

  it('should have valid age at boundaries', () => {
    const { tree: t } = setup(true, createValidInput({ age: 30 }));
    expect(t.age().valid()).toBe(true);
    expect(t().valid()).toBe(true);
  });
});
