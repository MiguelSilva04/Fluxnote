import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services';
import { CardComponent, CardContentComponent } from '../../../../shared/components/ui';

@Component({
  selector: 'app-external-callback',
  standalone: true,
  imports: [CommonModule, TranslateModule, CardComponent, CardContentComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8 text-center">
          @if (loading()) {
            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'AUTH.EXTERNAL_CALLBACK.PROCESSING' | translate }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'AUTH.EXTERNAL_CALLBACK.WAIT_MESSAGE' | translate }}</p>
          } @else if (error()) {
            <h2 class="text-xl font-bold text-red-600 mb-2">{{ 'AUTH.EXTERNAL_CALLBACK.FAIL_TITLE' | translate }}</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ error() }}</p>
          }
        </app-card-content>
      </app-card>
    </div>
  `
})
export class ExternalCallbackComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translateService = inject(TranslateService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.processCallback();
  }

  private async processCallback(): Promise<void> {
    const result = await this.authService.handleExternalCallback();
    this.loading.set(false);

    if (!result.success) {
      this.error.set(result.error ?? this.translateService.instant('TOASTS.EXTERNAL_LOGIN_FAILED'));
      return;
    }

    if (result.linked) {
      const current =
        this.sanitizeReturnUrl(result.returnUrl) ??
        this.sanitizeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')) ??
        '/settings';
      await this.router.navigateByUrl(current);
      return;
    }

    const nextUrl =
      this.sanitizeReturnUrl(result.returnUrl) ??
      this.sanitizeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')) ??
      '/dashboard';
    await this.router.navigateByUrl(nextUrl);
  }

  private sanitizeReturnUrl(returnUrl: string | null | undefined): string | null {
    if (!returnUrl) {
      return null;
    }

    return returnUrl.startsWith('/') ? returnUrl : null;
  }
}
