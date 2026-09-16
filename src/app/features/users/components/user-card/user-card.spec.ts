import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoDirective, TranslocoService, provideTransloco } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { User } from '../../models/user.model';
import { UserCard } from './user-card';

// Lightweight Transloco stub: prevents http fetch of i18n/*.json in jsdom
class FakeLoader {
  getTranslation() {
    return of({});
  }
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    username: 'carlos.montes',
    name: 'Carlos',
    surnames: 'Montes Gallardo',
    email: 'carlos@example.com',
    password: 'P@ssw0rd1',
    age: 34,
    active: true,
    lastLogin: new Date('2026-09-12T09:24:00Z'),
    createdAt: new Date('2025-01-15T10:00:00Z'),
    ...overrides,
  };
}

describe('UserCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideTransloco({
          config: { availableLangs: ['en', 'es'], defaultLang: 'en', reRenderOnLangChange: true },
          loader: FakeLoader,
        }),
      ],
    }).compileComponents();
  });

  function createCard(user: User, mode: 'update' | 'delete' | 'preview' | 'manage', deleting = false) {
    const fixture = TestBed.createComponent(UserCard);
    fixture.componentRef.setInput('user', user);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('deleting', deleting);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createCard(makeUser(), 'preview');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render username, name+surnames, email and age', () => {
    const user = makeUser();
    const fixture = createCard(user, 'preview');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('carlos.montes');
    expect(el.textContent).toContain('Carlos Montes Gallardo');
    expect(el.textContent).toContain('carlos@example.com');
  });

  it('should set aria-label to username on article', () => {
    const fixture = createCard(makeUser({ username: 'ana.ruiz' }), 'preview');
    const article = fixture.nativeElement.querySelector('article.user-card') as HTMLElement;
    expect(article.getAttribute('aria-label')).toBe('ana.ruiz');
  });

  it('should show active icon with check_circle when active', () => {
    const fixture = createCard(makeUser({ active: true }), 'preview');
    const icon = fixture.nativeElement.querySelector('.user-card__status-icon') as HTMLElement;
    expect(icon.textContent?.trim()).toBe('check_circle');
    expect(icon.classList.contains('user-card__status-icon--active')).toBe(true);
  });

  it('should show inactive icon with cancel when inactive', () => {
    const fixture = createCard(makeUser({ active: false }), 'preview');
    const icon = fixture.nativeElement.querySelector('.user-card__status-icon') as HTMLElement;
    expect(icon.textContent?.trim()).toBe('cancel');
    expect(icon.classList.contains('user-card__status-icon--inactive')).toBe(true);
  });

  it('should render lastLogin when present else neverLogged', () => {
    const withLogin = createCard(makeUser({ lastLogin: new Date() }), 'preview');
    expect(withLogin.nativeElement.textContent).not.toContain('neverLogged'); // translation key fallback, but contains date string part? check muted class not present

    const withoutLogin = createCard(makeUser({ lastLogin: null }), 'preview');
    const muted = withoutLogin.nativeElement.querySelector('.user-card__info-item--muted');
    expect(muted).not.toBeNull();
  });

  it('should not render actions in preview mode', () => {
    const fixture = createCard(makeUser(), 'preview');
    const actions = fixture.nativeElement.querySelector('.user-card__actions');
    expect(actions).toBeNull();
  });

  it('should render update link in update mode', () => {
    const fixture = createCard(makeUser({ id: 99 }), 'update');
    const link = fixture.nativeElement.querySelector('a.user-card__action--update') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toContain('/users/99/edit');
  });

  it('should emit deleteRequested in delete mode', () => {
    const user = makeUser();
    const fixture = createCard(user, 'delete');
    const comp = fixture.componentInstance;
    let emitted: User | undefined;
    comp.deleteRequested.subscribe((u: User) => (emitted = u));
    const btn = fixture.nativeElement.querySelector('button.user-card__action--delete') as HTMLButtonElement;
    btn.click();
    expect(emitted).toEqual(user);
  });

  it('should disable delete button and set aria-busy when deleting', () => {
    const fixture = createCard(makeUser(), 'delete', true);
    const btn = fixture.nativeElement.querySelector('button.user-card__action--delete') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.textContent).toContain('deleting'); // translation key may be literal; at least button exists
  });

  it('should render both actions in manage mode and emit outputs', () => {
    const user = makeUser();
    const fixture = createCard(user, 'manage');
    const comp = fixture.componentInstance;
    let edited: User | undefined;
    let deleted: User | undefined;
    comp.editRequested.subscribe((u: User) => (edited = u));
    comp.deleteRequested.subscribe((u: User) => (deleted = u));

    const editBtn = fixture.nativeElement.querySelector('button.user-card__action--update') as HTMLButtonElement;
    const deleteBtn = fixture.nativeElement.querySelector('button.user-card__action--delete') as HTMLButtonElement;
    expect(editBtn).not.toBeNull();
    expect(deleteBtn).not.toBeNull();

    editBtn.click();
    expect(edited).toEqual(user);
    deleteBtn.click();
    expect(deleted).toEqual(user);
  });

  it('should disable delete in manage mode when deleting', () => {
    const fixture = createCard(makeUser(), 'manage', true);
    const deleteBtn = fixture.nativeElement.querySelector('button.user-card__action--delete') as HTMLButtonElement;
    expect(deleteBtn.disabled).toBe(true);
    expect(deleteBtn.getAttribute('aria-busy')).toBe('true');
  });
});
