import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services';
import { CardComponent, CardContentComponent, ButtonComponent } from '../../../../shared/components/ui';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, CardComponent, CardContentComponent, ButtonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'AUTH.CONFIRM_EMAIL.TITLE' | translate }}</h1>

          @if (loading()) {
            <p class="text-gray-600 dark:text-gray-400">{{ 'AUTH.CONFIRM_EMAIL.LOADING' | translate }}</p>
          } @else if (error()) {
            <p class="text-red-600">{{ error() }}</p>
          } @else {
            <p class="text-green-700">{{ message() }}</p>
            <a routerLink="/login" class="mt-6 block">
              <app-button customClass="w-full" size="lg">{{ 'AUTH.CONFIRM_EMAIL.GO_TO_LOGIN' | translate }}</app-button>
            </a>
          }
        </app-card-content>
      </app-card>
    </div>
  `
})
export class ConfirmEmailComponent {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);

  loading = signal(true);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  async ngOnInit() {
    const userId = this.route.snapshot.queryParamMap.get('userId');
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!userId || !token) {
      this.loading.set(false);
      this.error.set(this.translate.instant('AUTH.CONFIRM_EMAIL.INVALID_PARAMS'));
      return;
    }

    try {
      const res = await this.auth.confirmEmail(userId, token);
      this.message.set(this.translate.instant('AUTH.CONFIRM_EMAIL.SUCCESS'));
      this.loading.set(false);

      setTimeout(() => {
        this.router.navigate(['/login'], { queryParams: { confirmed: 1 } });
      }, 600);
    } catch (err: any) {
      this.loading.set(false);
      this.error.set(err?.error?.message ?? this.translate.instant('AUTH.CONFIRM_EMAIL.FAILED'));
    }
  }
}
