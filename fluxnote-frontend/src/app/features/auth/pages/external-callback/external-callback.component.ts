import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services';
import { CardComponent, CardContentComponent } from '../../../../shared/components/ui';

@Component({
  selector: 'app-external-callback',
  standalone: true,
  imports: [CommonModule, CardComponent, CardContentComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8 text-center">
          @if (loading()) {
            <h2 class="text-xl font-bold text-gray-900 mb-2">Processing authentication...</h2>
            <p class="text-sm text-gray-500">Wait while we finish your authentication with google.</p>
          } @else if (error()) {
            <h2 class="text-xl font-bold text-red-600 mb-2">Fail on authentication</h2>
            <p class="text-sm text-gray-600">{{ error() }}</p>
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

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.processCallback();
  }

  private async processCallback(): Promise<void> {
    const result = await this.authService.handleExternalCallback();
    this.loading.set(false);

    if (!result.success) {
      this.error.set(result.error ?? 'External login failed.');
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
