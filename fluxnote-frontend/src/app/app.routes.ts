import { Routes } from '@angular/router';
import { authGuard, guestGuard, pendingEmailGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Landing page routes  dashboard
  {
    path: '',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/landing/pages/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'demo',
    loadComponent: () =>
      import('./features/landing/pages/demo.component').then((m) => m.DemoPageComponent),
  },
  {
    path: 'technologies',
    loadComponent: () =>
      import('./features/landing/pages/technologies.component').then(
        (m) => m.TechnologiesPageComponent,
      ),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/landing/pages/about.component').then((m) => m.AboutPageComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/landing/pages/contact.component').then((m) => m.ContactPageComponent),
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('./features/landing/pages/blog.component').then((m) => m.BlogPageComponent),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/landing/pages/privacy.component').then((m) => m.PrivacyPageComponent),
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./features/landing/pages/terms.component').then((m) => m.TermsPageComponent),
  },

  // Auth routes
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'pending-email',
    canActivate: [guestGuard, pendingEmailGuard],
    loadComponent: () =>
      import('./features/auth/pages/pending-email/pending-email.component').then(
        (m) => m.PendingEmailComponent,
      ),
  },
  {
    path: 'confirm-email',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/confirm-email/confirm-email.component').then(
        (m) => m.ConfirmEmailComponent,
      ),
  },
  {
    path: 'auth/external-callback',
    loadComponent: () =>
      import('./features/auth/pages/external-callback/external-callback.component').then(
        (m) => m.ExternalCallbackComponent
      ),
  },
  {
    path: 'auth/external-error',
    loadComponent: () =>
      import('./features/auth/pages/external-error/external-error.component').then(
        (m) => m.ExternalErrorComponent
      ),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  // Main app routes
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard.component').then((m) => m.DashboardComponent),
  },
  
  {
    path: 'editor',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/editor/document-editor.component').then((m) => m.DocumentEditorComponent),
  },
  {
    path: 'editor/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/editor/document-editor.component').then((m) => m.DocumentEditorComponent),
  },
  {
    path: 'teams',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/teams/pages/teams.component').then((m) => m.TeamsComponent),
  },
  {
    path: 'team-detail/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/teams/pages/team-detail.component').then((m) => m.TeamDetailComponent),
  },
  {
    path: 'document-invite/:token',
    loadComponent: () =>
      import('./features/invites/pages/accept-document-invite.component').then((m) => m.AcceptDocumentInviteComponent),
  },
  {
    path: 'team-invite/:token',
    loadComponent: () =>
      import('./features/invites/pages/accept-team-invite.component').then((m) => m.AcceptTeamInviteComponent),
  },
  {
    path: 'trash',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/trash/pages/trash.component').then((m) => m.TrashComponent),
  },
  {
    path: 'subscriptions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/subscriptions/pages/subscriptions.component').then(
        (m) => m.SubscriptionsComponent,
      ),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/pages/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: 'help',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/help/pages/help.component').then((m) => m.HelpComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/pages/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notifications/pages/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
  },
  {
    path: 'version-history',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/versions/pages/version-history.component').then(
        (m) => m.VersionHistoryComponent,
      ),
  },

  // Wildcard redirect to landing
  {
    path: '**',
    redirectTo: '',
  },
];
