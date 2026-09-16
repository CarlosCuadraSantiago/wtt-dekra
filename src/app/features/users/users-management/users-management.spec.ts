import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideTransloco } from '@jsverse/transloco';
import { of, Subject } from 'rxjs';
import { UsersService } from '../services/users.service';
import type { User, UserInput } from '../models/user.model';
import { MOCK_USERS } from '../data/mock-users.data';
import { UsersManagement } from './users-management';

class FakeLoader {
  getTranslation() {
    return of({});
  }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 99,
    username: 'test.user',
    name: 'Test',
    surnames: 'User Sample',
    email: 'test.user@example.com',
    password: 'P@ssw0rd9',
    age: 30,
    active: true,
    lastLogin: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('UsersManagement', () => {
  let usersServiceMock: {
    list: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let dialogMock: { open: ReturnType<typeof vi.fn> };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };
  let afterClosedSubject: Subject<boolean | undefined>;
  let routeMock: { snapshot: { paramMap: { get: ReturnType<typeof vi.fn> } } };

  beforeEach(async () => {
    localStorage.clear();
    // prefers-reduced-motion = true to skip gsap animations
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((q: string) => ({
        matches: true,
        media: q,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    usersServiceMock = {
      list: vi.fn().mockResolvedValue([...MOCK_USERS]),
      find: vi.fn().mockImplementation((id: number) => Promise.resolve(MOCK_USERS.find((u) => u.id === id))),
      create: vi.fn().mockImplementation((input: UserInput) => Promise.resolve({ ...makeUser(), ...input, id: 999 })),
      update: vi.fn().mockImplementation((id: number, input: UserInput) =>
        Promise.resolve({ ...MOCK_USERS[0], ...input, id }),
      ),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    afterClosedSubject = new Subject<boolean | undefined>();
    dialogMock = {
      open: vi.fn().mockReturnValue({ afterClosed: () => afterClosedSubject.asObservable() }),
    };
    snackBarMock = { open: vi.fn() };
    routeMock = { snapshot: { paramMap: { get: vi.fn().mockReturnValue(null) } } };

    await TestBed.configureTestingModule({
      imports: [UsersManagement],
      providers: [
        { provide: UsersService, useValue: usersServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: ActivatedRoute, useValue: routeMock },
        provideTransloco({
          config: { availableLangs: ['en', 'es'], defaultLang: 'en', reRenderOnLangChange: true },
          loader: FakeLoader,
        }),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(UsersManagement);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', async () => {
    const fixture = createComponent();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load users on init and populate dataSource', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    expect(usersServiceMock.list).toHaveBeenCalled();
    expect(comp.loading()).toBe(false);
    expect(comp.totalCount()).toBe(MOCK_USERS.length);
    expect(comp.dataSource.data.length).toBe(MOCK_USERS.length);
  });

  it('should filter users via computed filteredUsers and totalCount', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    // initially all
    expect(comp.filteredUsers().length).toBe(MOCK_USERS.length);
    // simulate searchTerm signal directly via private
    (comp as unknown as { searchTerm: { set: (v: string) => void } })['searchTerm'].set('carlo');
    expect(comp.filteredUsers().length).toBe(1);
    expect(comp.filteredUsers()[0].username).toBe('carlo.montes');
    expect(comp.totalCount()).toBe(1);
  });

  it('should paginate visibleUsers with PAGE_SIZE 12', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    expect(comp.visibleUsers().length).toBe(12);
    expect(comp.hasMore()).toBe(true);
    comp.loadMore();
    expect(comp.visibleUsers().length).toBe(22);
    expect(comp.hasMore()).toBe(false);
  });

  it('should handle loadMore no-op when no more', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.loadMore(); // to 22
    const count = comp.visibleUsers().length;
    comp.loadMore();
    expect(comp.visibleUsers().length).toBe(count);
  });

  it('should persist viewMode to localStorage and restore', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    expect(comp.viewMode()).toBe('table');
    comp.setViewMode('cards');
    expect(comp.viewMode()).toBe('cards');
    // effect that persists to localStorage runs async — flush microtasks
    await new Promise((r) => setTimeout(r, 0));
    // @ts-ignore flush effects if available
    if ((TestBed as unknown as { flushEffects?: () => void }).flushEffects) {
      (TestBed as unknown as { flushEffects: () => void }).flushEffects();
    }
    expect(localStorage.getItem('wtt-dekra:usersViewMode')).toBe('cards');
    comp.setViewMode('table');
    await new Promise((r) => setTimeout(r, 0));
    if ((TestBed as unknown as { flushEffects?: () => void }).flushEffects) {
      (TestBed as unknown as { flushEffects: () => void }).flushEffects();
    }
    expect(localStorage.getItem('wtt-dekra:usersViewMode')).toBe('table');
  });

  it('should read viewMode from localStorage on init', async () => {
    localStorage.setItem('wtt-dekra:usersViewMode', 'cards');
    const fixture = TestBed.createComponent(UsersManagement);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    expect(fixture.componentInstance.viewMode()).toBe('cards');
  });

  it('should openCreate set viewState and previewInput', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.openCreate();
    expect(comp.viewState()).toBe('create');
    expect(comp.editingUser()).toBeNull();
    expect(comp.previewUser()).not.toBeNull();
    expect(comp.previewUser()!.username).toBe('username'); // default fallback
  });

  it('should openEdit set editingUser and viewState', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    const user = MOCK_USERS[1];
    comp.openEdit(user);
    expect(comp.viewState()).toBe('edit');
    expect(comp.editingUser()).toEqual(user);
    expect(comp.previewUser()).toEqual(user); // when previewInput not yet updated? Actually preview merges, but base is user
  });

  it('should closeForm reset to list', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.openCreate();
    expect(comp.viewState()).toBe('create');
    comp.closeForm();
    // with prefers-reduced-motion true, animateOut calls done synchronously
    await new Promise((r) => setTimeout(r, 0));
    expect(comp.viewState()).toBe('list');
    expect(comp.editingUser()).toBeNull();
  });

  it('should update previewInput via onValueChange and reflect in previewUser (create)', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.openCreate();
    const input: UserInput = {
      username: 'new.user',
      name: 'New',
      surnames: 'User Sample',
      email: 'new@example.com',
      password: 'P@ssw0rd9',
      age: 25,
      active: false,
    };
    comp.onValueChange(input);
    expect(comp.previewUser()!.username).toBe('new.user');
    expect(comp.previewUser()!.name).toBe('New');
    expect(comp.previewUser()!.age).toBe(25);
    expect(comp.previewUser()!.active).toBe(false);
  });

  it('should compute previewUser fallback in create when input empty', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.openCreate();
    // previewInput is non-null with empty strings, previewUser will fallback to defaults
    comp.onValueChange({ username: '', name: '', surnames: '', email: '', password: '', age: 18, active: true });
    expect(comp.previewUser()!.username).toBe('username');
    expect(comp.previewUser()!.email).toBe('email@example.com');
  });

  it('should onSubmit create flow: call create, snack, reload list, reset to list', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.openCreate();
    // list already called once on init; next call after create should return +1
    usersServiceMock.list.mockResolvedValueOnce([...MOCK_USERS, makeUser({ id: 999 })]);
    const input: UserInput = {
      username: 'new.user',
      name: 'New',
      surnames: 'User',
      email: 'new@example.com',
      password: 'P@ssw0rd9',
      age: 30,
      active: true,
    };
    await comp.onSubmit(input);
    expect(usersServiceMock.create).toHaveBeenCalledWith(input);
    expect(snackBarMock.open).toHaveBeenCalled();
    expect(comp.viewState()).toBe('list');
    expect(comp.totalCount()).toBe(MOCK_USERS.length + 1);
  });

  it('should onSubmit edit flow: call update', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    const user = MOCK_USERS[0];
    comp.openEdit(user);
    const input: UserInput = { username: 'carlo.montes', name: 'Renamed', surnames: 'Montes', email: 'carlo@example.com', password: '', age: 34, active: true };
    await comp.onSubmit(input);
    expect(usersServiceMock.update).toHaveBeenCalledWith(user.id, input);
    expect(snackBarMock.open).toHaveBeenCalled();
    expect(comp.viewState()).toBe('list');
  });

  it('should handle onSubmit error and show error snack', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.openCreate();
    usersServiceMock.create.mockRejectedValueOnce(new Error('fail'));
    await comp.onSubmit({
      username: 'x',
      name: 'x',
      surnames: 'x',
      email: 'x@example.com',
      password: 'P@ssw0rd9',
      age: 30,
      active: true,
    });
    expect(snackBarMock.open).toHaveBeenCalled();
    // viewState stays create on error
    expect(comp.viewState()).toBe('create');
  });

  it('should confirmDelete open dialog and on confirm call delete', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    const user = MOCK_USERS[0];
    comp.confirmDelete(user);
    expect(dialogMock.open).toHaveBeenCalled();
    // simulate confirm
    afterClosedSubject.next(true);
    // wait for async delete
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(usersServiceMock.delete).toHaveBeenCalledWith(user.id);
    expect(comp.deletingId()).toBeNull();
    expect(comp.dataSource.data.find((u) => u.id === user.id)).toBeUndefined();
    expect(snackBarMock.open).toHaveBeenCalled();
  });

  it('should not delete when dialog cancelled', async () => {
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.confirmDelete(MOCK_USERS[0]);
    afterClosedSubject.next(false);
    await new Promise((r) => setTimeout(r, 10));
    expect(usersServiceMock.delete).not.toHaveBeenCalled();
  });

  it('should handle delete failure and show error snackbar', async () => {
    usersServiceMock.delete.mockRejectedValueOnce(new Error('fail'));
    const fixture = createComponent();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.confirmDelete(MOCK_USERS[0]);
    afterClosedSubject.next(true);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 10));
    expect(snackBarMock.open).toHaveBeenCalled();
    expect(comp.deletingId()).toBeNull();
  });

  it('should filter dataSource via searchControl debounce', async () => {
    vi.useFakeTimers();
    const fixture = createComponent();
    // need to re-create after fake timers? ensure debounce works
    await vi.advanceTimersByTimeAsync(0);
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp.searchControl.setValue('marta');
    await vi.advanceTimersByTimeAsync(350);
    expect(comp.dataSource.filter).toBe('marta');
    vi.useRealTimers();
  });

  it('should handle route param id on init to auto open edit', async () => {
    routeMock.snapshot.paramMap.get.mockReturnValue(String(MOCK_USERS[2].id));
    const fixture = TestBed.createComponent(UsersManagement);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    expect(comp.viewState()).toBe('edit');
    expect(comp.editingUser()?.id).toBe(MOCK_USERS[2].id);
  });

  it('should fallback to service find when route id not in initial list', async () => {
    const missingId = 9999;
    routeMock.snapshot.paramMap.get.mockReturnValue(String(missingId));
    const foundUser = makeUser({ id: missingId, username: 'missing.user' });
    usersServiceMock.find.mockResolvedValueOnce(foundUser);
    usersServiceMock.list.mockResolvedValueOnce([...MOCK_USERS]);
    const fixture = TestBed.createComponent(UsersManagement);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    expect(usersServiceMock.find).toHaveBeenCalledWith(missingId);
    expect(comp.editingUser()?.id).toBe(missingId);
    expect(comp.viewState()).toBe('edit');
  });
});
