import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { LucideAngularModule, icons } from 'lucide-angular';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader, TRANSLATE_HTTP_LOADER_CONFIG } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/services/auth.interceptor';
import { AuthService } from './core/services';
import { LanguageService } from './core/services/language.service';

const lucideProviders = LucideAngularModule.pick(icons).providers ?? [];

const translateProviders = TranslateModule.forRoot({
  loader: {
    provide: TranslateLoader,
    useClass: TranslateHttpLoader
  }
}).providers ?? [];

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return auth.initAuth();
    }),
    provideAppInitializer(() => {
      const lang = inject(LanguageService);
      lang.init();
    }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    ...lucideProviders,
    ...translateProviders,
    { provide: TRANSLATE_HTTP_LOADER_CONFIG, useValue: { prefix: './assets/i18n/', suffix: '.json' } }
  ]
};
