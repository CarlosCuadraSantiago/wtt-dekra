import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoHttpLoader } from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  let loader: TranslocoHttpLoader;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TranslocoHttpLoader],
    });
    loader = TestBed.inject(TranslocoHttpLoader);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(loader).toBeTruthy();
  });

  it('should fetch translation for given lang', () => {
    const mock = { hello: 'world' };
    loader.getTranslation('en').subscribe((data) => {
      expect(data).toEqual(mock);
    });

    const req = httpMock.expectOne('i18n/en.json');
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('should fetch different lang files', () => {
    const en = { a: 'en' };
    const es = { a: 'es' };

    loader.getTranslation('es').subscribe((data) => expect(data).toEqual(es));
    const reqEs = httpMock.expectOne('i18n/es.json');
    reqEs.flush(es);

    loader.getTranslation('en').subscribe((data) => expect(data).toEqual(en));
    const reqEn = httpMock.expectOne('i18n/en.json');
    reqEn.flush(en);
  });
});
