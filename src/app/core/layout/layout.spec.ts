import { BreakpointObserver } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { of, Subject } from 'rxjs';
import { TranslocoHttpLoader } from '../../transloco-loader';
import { Layout } from './layout';

class FakeLoader {
  get translationCalls(): string[] {
    return [];
  }
  getTranslation() {
    return of({});
  }
}

describe('Layout', () => {
  let breakpointSubject: Subject<{ matches: boolean; breakpoints: Record<string, boolean> }>;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-theme');
    breakpointSubject = new Subject();
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideTransloco({
          config: { availableLangs: ['en', 'es'], defaultLang: 'en', reRenderOnLangChange: true },
          loader: FakeLoader as unknown as typeof TranslocoHttpLoader,
        }),
        {
          provide: BreakpointObserver,
          useValue: { observe: () => breakpointSubject.asObservable() },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-theme');
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Layout);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should toggle dark mode and update document class and localStorage', async () => {
    const fixture = TestBed.createComponent(Layout);
    const component = fixture.componentInstance;
    expect(component.isDarkMode()).toBe(false);
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);

    component.toggleTheme();
    expect(component.isDarkMode()).toBe(true);

    // effect flush
    await new Promise((r) => setTimeout(r, 0));
    if ((TestBed as unknown as { flushEffects?: () => void }).flushEffects) {
      (TestBed as unknown as { flushEffects: () => void }).flushEffects();
    }
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    expect(localStorage.getItem('wtt-dekra:theme')).toBe('dark');

    component.toggleTheme();
    expect(component.isDarkMode()).toBe(false);
    await new Promise((r) => setTimeout(r, 0));
    if ((TestBed as unknown as { flushEffects?: () => void }).flushEffects) {
      (TestBed as unknown as { flushEffects: () => void }).flushEffects();
    }
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
    expect(localStorage.getItem('wtt-dekra:theme')).toBe('light');
  });

  it('should initialize dark mode from localStorage (dark/true)', () => {
    localStorage.setItem('wtt-dekra:theme', 'dark');
    const fixture = TestBed.createComponent(Layout);
    expect(fixture.componentInstance.isDarkMode()).toBe(true);

    localStorage.clear();
    localStorage.setItem('wtt-dekra:theme', 'true');
    const fixture2 = TestBed.createComponent(Layout);
    expect(fixture2.componentInstance.isDarkMode()).toBe(true);
  });

  it('should initialize light mode from localStorage (light/false or missing)', () => {
    localStorage.setItem('wtt-dekra:theme', 'light');
    expect(TestBed.createComponent(Layout).componentInstance.isDarkMode()).toBe(false);
    localStorage.clear();
    localStorage.setItem('wtt-dekra:theme', 'false');
    expect(TestBed.createComponent(Layout).componentInstance.isDarkMode()).toBe(false);
    localStorage.clear();
    expect(TestBed.createComponent(Layout).componentInstance.isDarkMode()).toBe(false);
  });

  it('should set language and update computed flag/label/src', async () => {
    const fixture = TestBed.createComponent(Layout);
    const comp = fixture.componentInstance;
    expect(comp.activeLang()).toBe('en');
    expect(comp.langFlagSrc()).toBe('flags/gb.svg');
    expect(comp.langFlagAlt()).toBe('United Kingdom');
    expect(comp.langLabel()).toBe('EN');

    comp.setLang('es');
    expect(comp.activeLang()).toBe('es');
    expect(comp.langFlagSrc()).toBe('flags/es.svg');
    expect(comp.langFlagAlt()).toBe('España');
    expect(comp.langLabel()).toBe('ES');

    // persist to localStorage via effect
    await new Promise((r) => setTimeout(r, 0));
    if ((TestBed as unknown as { flushEffects?: () => void }).flushEffects) {
      (TestBed as unknown as { flushEffects: () => void }).flushEffects();
    }
    expect(localStorage.getItem('wtt-dekra:lang')).toBe('es');
  });

  it('should ignore invalid language in setLang', () => {
    const fixture = TestBed.createComponent(Layout);
    const comp = fixture.componentInstance;
    comp.setLang('es');
    expect(comp.activeLang()).toBe('es');
    comp.setLang('fr');
    expect(comp.activeLang()).toBe('es');
    comp.setLang('');
    expect(comp.activeLang()).toBe('es');
  });

  it('should read language from localStorage', () => {
    localStorage.setItem('wtt-dekra:lang', 'es');
    const fixture = TestBed.createComponent(Layout);
    expect(fixture.componentInstance.activeLang()).toBe('es');
    expect(fixture.componentInstance.langLabel()).toBe('ES');
  });

  it('should fallback to en when stored lang invalid', () => {
    localStorage.setItem('wtt-dekra:lang', 'fr');
    const fixture = TestBed.createComponent(Layout);
    expect(fixture.componentInstance.activeLang()).toBe('en');
  });

  it('should toggle sidebar', () => {
    const fixture = TestBed.createComponent(Layout);
    const comp = fixture.componentInstance;
    const initial = comp.sidebarOpened();
    comp.toggleSidebar();
    expect(comp.sidebarOpened()).toBe(!initial);
    comp.toggleSidebar();
    expect(comp.sidebarOpened()).toBe(initial);
  });

  it('should update isDesktop and sidebarOpened on breakpoint changes', () => {
    const fixture = TestBed.createComponent(Layout);
    const comp = fixture.componentInstance;
    // initially true (signal default) before breakpoint emits
    expect(comp.isDesktop()).toBe(true);

    breakpointSubject.next({ matches: false, breakpoints: {} });
    expect(comp.isDesktop()).toBe(false);
    expect(comp.sidebarOpened()).toBe(false);

    breakpointSubject.next({ matches: true, breakpoints: {} });
    expect(comp.isDesktop()).toBe(true);
    expect(comp.sidebarOpened()).toBe(true);
  });
});
