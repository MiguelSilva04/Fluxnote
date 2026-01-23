import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { LucideAngularModule, icons } from 'lucide-angular';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/services/auth.interceptor';

const lucideProviders = LucideAngularModule.pick(icons).providers ?? [];

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    ...lucideProviders
  ]
};
