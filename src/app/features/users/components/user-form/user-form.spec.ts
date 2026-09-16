import { TestBed } from '@angular/core/testing';
import { provideTransloco } from '@jsverse/transloco';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { User, UserInput } from '../../models/user.model';
import { UsersService } from '../../services/users.service';
import { UserForm } from './user-form';

class FakeLoader {
  getTranslation() {
    return of({});
  }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 5,
    username: 'ana.ruiz',
    name: 'Ana',
    surnames: 'Ruiz Ferrer',
    email: 'ana.ruiz@example.com',
    password: 'P@ssw0rd2',
    age: 29,
    active: true,
    lastLogin: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('UserForm', () => {
  let snackBarSpy: { open: ReturnType<typeof vi.fn> };
  let usersServiceMock: { list: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    snackBarSpy = { open: vi.fn() };
    usersServiceMock = {
      list: vi.fn().mockResolvedValue([
        makeUser(),
        { ...makeUser(), id: 2, username: 'carlos.montes', name: 'Carlos', surnames: 'Montes Gallardo' },
      ]),
    };

    await TestBed.configureTestingModule({
      imports: [UserForm],
      providers: [
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: UsersService, useValue: usersServiceMock },
        provideTransloco({
          config: { availableLangs: ['en', 'es'], defaultLang: 'en', reRenderOnLangChange: true },
          loader: FakeLoader,
        }),
      ],
    }).compileComponents();
  });

  function createForm(initialUser: User | null = null) {
    const fixture = TestBed.createComponent(UserForm);
    if (initialUser) fixture.componentRef.setInput('initialUser', initialUser);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createForm();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize form with empty model when no initialUser (requirePassword=true)', async () => {
    const fixture = createForm();
    await fixture.whenStable();
    const comp = fixture.componentInstance as unknown as { userForm: { (): { valid: () => boolean } } };
    expect(comp.userForm).toBeDefined();
    expect(comp.userForm().valid()).toBe(false);
  });

  it('should initialize form with initialUser data and no password (requirePassword=false)', async () => {
    const user = makeUser();
    const fixture = createForm(user);
    await fixture.whenStable();
    const comp = fixture.componentInstance as unknown as {
      userForm: { (): { value: () => UserInput } };
    };
    const value = comp.userForm().value();
    expect(value.username).toBe('ana.ruiz');
    expect(value.name).toBe('Ana');
    expect(value.surnames).toBe('Ruiz Ferrer');
    expect(value.email).toBe('ana.ruiz@example.com');
    expect(value.password).toBe('');
    expect(value.age).toBe(29);
  });

  it('should load existingUsernames from UsersService', async () => {
    const fixture = createForm();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    expect(usersServiceMock.list).toHaveBeenCalled();
  });

  it('should emit valueChange on model changes', async () => {
    const fixture = createForm();
    const comp = fixture.componentInstance;
    const emitted: UserInput[] = [];
    comp.valueChange.subscribe((v: UserInput) => emitted.push(v));
    await fixture.whenStable();
    emitted.length = 0;
    comp.onClear();
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));
    expect(emitted.length).toBeGreaterThan(0);
  });

  it('should show snackbar and not emit submitted when form invalid on submit', async () => {
    const fixture = createForm();
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    let emitted: UserInput | undefined;
    comp.submitted.subscribe((v: UserInput) => (emitted = v));
    comp.onSubmit();
    expect(snackBarSpy.open).toHaveBeenCalled();
    expect(emitted).toBeUndefined();
  });

  it('should emit submitted when form valid (create mode)', async () => {
    const fixture = createForm();
    fixture.detectChanges();
    await fixture.whenStable();
    const comp: UserForm = fixture.componentInstance;
    const modelSignal = (comp as unknown as { model: { set: (v: UserInput) => void } })['model'];
    await new Promise((r) => setTimeout(r, 0));
    modelSignal.set({
      username: 'test.user',
      name: 'Test',
      surnames: 'User Sample',
      email: 'test@example.com',
      password: 'P@ssw0rd9',
      age: 30,
      active: true,
    });
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));
    let emitted: UserInput | undefined;
    comp.submitted.subscribe((v: UserInput) => (emitted = v));
    comp.onSubmit();
    expect(emitted).toBeDefined();
    expect(emitted!.username).toBe('test.user');
    expect(emitted!.email).toBe('test@example.com');
  });

  it('should omit empty password in edit mode', async () => {
    const user = makeUser();
    const fixture = createForm(user);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    const comp: UserForm = fixture.componentInstance;
    const modelSignal = (comp as unknown as { model: { set: (v: UserInput) => void } })['model'];
    modelSignal.set({
      username: 'ana.ruiz',
      name: 'Ana Updated',
      surnames: 'Ruiz Ferrer',
      email: 'ana.ruiz@example.com',
      password: '',
      age: 30,
      active: true,
    });
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));
    let emitted: Record<string, unknown> | undefined;
    comp.submitted.subscribe((v: unknown) => (emitted = v as Record<string, unknown>));
    comp.onSubmit();
    expect(emitted).toBeDefined();
    expect(emitted!['name']).toBe('Ana Updated');
    expect('password' in emitted!).toBe(false);
  });

  it('should emit password when provided in edit mode', async () => {
    const user = makeUser();
    const fixture = createForm(user);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    const comp: UserForm = fixture.componentInstance;
    const modelSignal = (comp as unknown as { model: { set: (v: UserInput) => void } })['model'];
    modelSignal.set({
      username: 'ana.ruiz',
      name: 'Ana',
      surnames: 'Ruiz Ferrer',
      email: 'ana.ruiz@example.com',
      password: 'NewP@ssw0rd',
      age: 30,
      active: true,
    });
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 10));
    let emitted: UserInput | undefined;
    comp.submitted.subscribe((v: UserInput) => (emitted = v));
    comp.onSubmit();
    expect(emitted!.password).toBe('NewP@ssw0rd');
  });

  it('should reset model on onClear in create mode', async () => {
    const fixture = createForm();
    await fixture.whenStable();
    const comp: UserForm = fixture.componentInstance;
    const modelSignal = (comp as unknown as { model: { set: (v: UserInput) => void } })['model'];
    modelSignal.set({
      username: 'temp',
      name: 'Temp',
      surnames: 'User',
      email: 'temp@example.com',
      password: 'P@ssw0rd9',
      age: 40,
      active: false,
    });
    fixture.detectChanges();
    comp.onClear();
    fixture.detectChanges();
    const value = (comp as unknown as { userForm: { (): { value: () => UserInput } } }).userForm().value();
    expect(value.username).toBe('');
    expect(value.name).toBe('');
    expect(value.age).toBe(18);
  });

  it('should restore initialUser on onClear in edit mode', async () => {
    const user = makeUser({ name: 'Ana', age: 29 });
    const fixture = createForm(user);
    await fixture.whenStable();
    const comp: UserForm = fixture.componentInstance;
    const modelSignal = (comp as unknown as { model: { set: (v: UserInput) => void } })['model'];
    modelSignal.set({
      username: 'changed',
      name: 'Changed',
      surnames: 'Changed',
      email: 'changed@example.com',
      password: 'P@ssw0rd9',
      age: 99,
      active: false,
    });
    comp.onClear();
    fixture.detectChanges();
    const value = (comp as unknown as { userForm: { (): { value: () => UserInput } } }).userForm().value();
    expect(value.username).toBe('ana.ruiz');
    expect(value.name).toBe('Ana');
    expect(value.age).toBe(29);
    expect(value.password).toBe('');
  });
});
