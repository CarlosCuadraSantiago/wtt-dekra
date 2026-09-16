import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTransloco } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { User } from '../../models/user.model';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';

class FakeLoader {
  getTranslation() {
    return of({});
  }
}

function makeUser(): User {
  return {
    id: 42,
    username: 'ana.ruiz',
    name: 'Ana',
    surnames: 'Ruiz Ferrer',
    email: 'ana.ruiz@example.com',
    password: 'P@ssw0rd2',
    age: 29,
    active: true,
    lastLogin: new Date(),
    createdAt: new Date(),
  };
}

describe('ConfirmDeleteDialog', () => {
  let dialogRefMock: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialogRefMock = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ConfirmDeleteDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { user: makeUser() } },
        { provide: MatDialogRef, useValue: dialogRefMock },
        provideTransloco({
          config: { availableLangs: ['en', 'es'], defaultLang: 'en', reRenderOnLangChange: true },
          loader: FakeLoader,
        }),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteDialog);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should inject data with user', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteDialog);
    expect(fixture.componentInstance.data.user.username).toBe('ana.ruiz');
    expect(fixture.componentInstance.data.user.email).toBe('ana.ruiz@example.com');
  });

  it('should close with true when confirmed', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteDialog);
    fixture.componentInstance.close(true);
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should close with false when cancelled', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteDialog);
    fixture.componentInstance.close(false);
    expect(dialogRefMock.close).toHaveBeenCalledWith(false);
  });

  it('should render dialog structure with transloco keys', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteDialog);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // with FakeLoader returning {}, transloco falls back to the key itself — we verify structure rather than interpolated username
    expect(el.querySelector('.confirm-delete')).not.toBeNull();
    expect(el.querySelector('#delete-title')).not.toBeNull();
    expect(el.querySelector('#delete-desc')).not.toBeNull();
    expect(el.textContent).toContain('confirmDelete');
    // component data still holds the real username for unit logic
    expect(fixture.componentInstance.data.user.username).toBe('ana.ruiz');
  });

  it('should have cancel and confirm buttons wired to close', () => {
    const fixture = TestBed.createComponent(ConfirmDeleteDialog);
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    // click cancel (first) -> false, confirm (second) -> true
    buttons[0].click();
    expect(dialogRefMock.close).toHaveBeenCalledWith(false);
    buttons[1].click();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });
});
