import { Routes } from '@angular/router';

export const routes: Routes = [
  // Landing page routes
  {
    path: '',
    loadComponent: () => import('./features/landing/pages/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'demo',
    loadComponent: () => import('./features/landing/pages/demo.component').then(m => m.DemoPageComponent)
  },
  {
    path: 'technologies',
    loadComponent: () => import('./features/landing/pages/technologies.component').then(m => m.TechnologiesPageComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./features/landing/pages/about.component').then(m => m.AboutPageComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/landing/pages/contact.component').then(m => m.ContactPageComponent)
  },
  {
    path: 'blog',
    loadComponent: () => import('./features/landing/pages/blog.component').then(m => m.BlogPageComponent)
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/landing/pages/privacy.component').then(m => m.PrivacyPageComponent)
  },
  {
    path: 'terms',
    loadComponent: () => import('./features/landing/pages/terms.component').then(m => m.TermsPageComponent)
  },

  // Auth routes
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },

  // Main app routes
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/pages/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'editor',
    loadComponent: () => import('./features/editor/document-editor.component').then(m => m.DocumentEditorComponent)
  },
  {
    path: 'teams',
    loadComponent: () => import('./features/teams/pages/teams.component').then(m => m.TeamsComponent)
  },
  {
    path: 'team-detail',
    loadComponent: () => import('./features/teams/pages/team-detail.component').then(m => m.TeamDetailComponent)
  },
  {
    path: 'subscriptions',
    loadComponent: () => import('./features/subscriptions/pages/subscriptions.component').then(m => m.SubscriptionsComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/pages/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'help',
    loadComponent: () => import('./features/help/pages/help.component').then(m => m.HelpComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/pages/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'notifications',
    loadComponent: () => import('./features/notifications/pages/notifications.component').then(m => m.NotificationsComponent)
  },
  {
    path: 'version-history',
    loadComponent: () => import('./features/versions/pages/version-history.component').then(m => m.VersionHistoryComponent)
  },

  // Backend API test route
  {
    path: 'people',
    loadComponent: () => import('./features/people/people.component').then(m => m.PeopleComponent)
  },

  // Wildcard redirect to landing
  {
    path: '**',
    redirectTo: ''
  }
];
