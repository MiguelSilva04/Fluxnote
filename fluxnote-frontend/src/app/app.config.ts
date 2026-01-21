import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { LucideAngularModule, icons } from 'lucide-angular';

import { routes } from './app.routes';

const lucideProviders = LucideAngularModule.pick(icons).providers ?? [];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    ...lucideProviders
  ]
};
