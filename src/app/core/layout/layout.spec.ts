import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from '../../transloco-loader';
import { Layout } from './layout';

describe('Layout', () => {
  beforeEach(async () => {
    localStorage.clear();
    // asegura que la clase del DOM quede limpia entre tests
    document.documentElement.classList.remove('dark-theme');
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideTransloco({
          config: { availableLangs: ['en', 'es'], defaultLang: 'en', reRenderOnLangChange: true },
          loader: TranslocoHttpLoader,
        }),
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

  it('should toggle dark mode', () => {
    const fixture = TestBed.createComponent(Layout);
    const component = fixture.componentInstance;
    expect(component.isDarkMode()).toBe(false);
    component.toggleTheme();
    expect(component.isDarkMode()).toBe(true);
  });
});
