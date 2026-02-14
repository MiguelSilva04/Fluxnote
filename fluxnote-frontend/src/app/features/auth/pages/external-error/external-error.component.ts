import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardComponent, CardContentComponent, ButtonComponent } from '../../../../shared/components/ui';

@Component({
  selector: 'app-external-error',
  standalone: true,
  imports: [CommonModule, CardComponent, CardContentComponent, ButtonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8 text-center">
          <h1 class="text-2xl font-bold text-gray-900 mb-3">{{ title }}</h1>
          <p class="text-sm text-gray-600 mb-6">{{ message }}</p>
          <app-button customClass="w-full" (onClick)="goToLogin()">Go back to login</app-button>
        </app-card-content>
      </app-card>
    </div>
  `
})
export class ExternalErrorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly title: string;
  readonly message: string;

  constructor() {
    const error = this.route.snapshot.queryParamMap.get('error');
    const description = this.route.snapshot.queryParamMap.get('error_description');
    this.title = this.resolveTitle(error);
    this.message = description || this.resolveMessage(error);
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  private resolveTitle(error: string | null): string {
    return error === 'provider_already_linked'
      ? 'Google Account already linked'
      : 'Login with google unavailable';
  }

  private resolveMessage(error: string | null): string {
    switch (error) {
      case 'provider_already_linked':
        return 'This Google Account is already linked to another user.';
      case 'email_not_provided':
        return 'This Google Account didnt supply an email';
      default:
        return 'An error ocurred during the external authentication process.';
    }
  }
}
