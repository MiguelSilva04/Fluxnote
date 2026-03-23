import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CardComponent, CardContentComponent, ButtonComponent } from '../../../../shared/components/ui';

@Component({
  selector: 'app-external-error',
  standalone: true,
  imports: [CommonModule, TranslateModule, CardComponent, CardContentComponent, ButtonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8 text-center">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">{{ title }}</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">{{ message }}</p>
          <app-button customClass="w-full" (onClick)="goToLogin()">{{ 'AUTH.EXTERNAL_ERROR.GO_BACK_LOGIN' | translate }}</app-button>
        </app-card-content>
      </app-card>
    </div>
  `
})
export class ExternalErrorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);

  readonly title: string;
  readonly message: string;

  constructor() {
    const error = this.route.snapshot.queryParamMap.get('error');
    const description = this.route.snapshot.queryParamMap.get('error_description');
    this.title = this.resolveTitle(error);
    this.message = description || this.resolveMessage(error);
  }

  goToLogin(): void {
    void this.router.navigate(['/profile']);
  }

  private resolveTitle(error: string | null): string {
    return error === 'provider_already_linked'
      ? this.translateService.instant('AUTH.EXTERNAL_ERROR.ACCOUNT_ALREADY_LINKED')
      : this.translateService.instant('AUTH.EXTERNAL_ERROR.EXTERNAL_LOGIN_UNAVAILABLE');
  }

  private resolveMessage(error: string | null): string {
    switch (error) {
      case 'provider_already_linked':
        return this.translateService.instant('AUTH.EXTERNAL_ERROR.PROVIDER_ALREADY_LINKED_MSG');
      case 'email_not_provided':
        return this.translateService.instant('AUTH.EXTERNAL_ERROR.EMAIL_NOT_PROVIDED_MSG');
      default:
        return this.translateService.instant('AUTH.EXTERNAL_ERROR.GENERIC_ERROR_MSG');
    }
  }
}
