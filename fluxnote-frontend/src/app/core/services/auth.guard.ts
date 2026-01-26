import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};

/**
 * Guard que protege a rota pending-email de acessos manuais via URL.
 * Só permite acesso se a navegação veio com o state { fromRegistration: true }.
 */
export const pendingEmailGuard: CanActivateFn = () => {
  const router = inject(Router);
  const navigation = router.getCurrentNavigation();
  const state = navigation?.extras?.state as { fromRegistration?: boolean } | undefined;

  if (state?.fromRegistration) {
    return true;
  }

  return router.createUrlTree(['/register']);
};
