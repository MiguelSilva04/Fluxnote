import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../../core/services';
import { ButtonComponent, InputComponent, CardComponent, CardContentComponent } from '../../../../shared/components/ui';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    ButtonComponent,
    InputComponent,
    CardComponent,
    CardContentComponent,
    TranslateModule
  ],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div class="mb-8 text-center">
        <div class="inline-flex items-center justify-center p-3 bg-[#155347] rounded-xl mb-4 shadow-lg shadow-[#155347]/20">
          <lucide-icon name="file-text" class="h-8 w-8 text-white"></lucide-icon>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">FluxNote</h1>
      </div>

      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8">
          <a routerLink="/login" class="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors">
            <lucide-icon name="arrow-left" class="h-4 w-4 mr-1"></lucide-icon>
            {{ 'AUTH.FORGOT_PASSWORD.BACK_LOGIN' | translate }}
          </a>

          @if (!isSubmitted()) {
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'AUTH.FORGOT_PASSWORD.TITLE' | translate }}</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-8">
              {{ 'AUTH.FORGOT_PASSWORD.SUBTITLE' | translate }}
            </p>

            <form (ngSubmit)="handleSubmit()" class="space-y-6">
              <app-input
                [label]="'AUTH.FORGOT_PASSWORD.EMAIL' | translate"
                type="email"
                [placeholder]="'AUTH.LOGIN.EMAIL_PLACEHOLDER' | translate"
                [(ngModel)]="email"
                name="email"
                [hasLeftIcon]="true"
                [required]="true"
              >
                <lucide-icon leftIcon name="mail" class="h-4 w-4"></lucide-icon>
              </app-input>

              <app-button type="submit" customClass="w-full mt-5" size="lg" [isLoading]="isLoading()">
                {{ 'AUTH.FORGOT_PASSWORD.SEND_LINK' | translate }}
              </app-button>
            </form>
          } @else {
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                <lucide-icon name="badge-check" class="h-8 w-8 text-green-600"></lucide-icon>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'AUTH.FORGOT_PASSWORD.CHECK_EMAIL' | translate }}</h2>
              <p class="text-gray-600 dark:text-gray-400 mb-8">
                {{ 'AUTH.FORGOT_PASSWORD.SENT_TO' | translate }}
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ email }}</span>
              </p>
              <app-button variant="outline" customClass="w-full" (onClick)="isSubmitted.set(false)">
                {{ 'AUTH.FORGOT_PASSWORD.TRY_ANOTHER' | translate }}
              </app-button>

              @if (devResetLink()) {
                <div class="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-left">
                  <p class="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">DEV MODE — Reset Link</p>
                  <button
                    (click)="navigateDevLink()"
                    class="w-full py-2 px-4 rounded-md bg-[#155347] text-white text-sm font-medium hover:bg-[#0f3f35] transition-colors"
                  >
                    {{ 'AUTH.FORGOT_PASSWORD.OPEN_RESET_LINK' | translate }}
                  </button>
                </div>
              }
            </div>
          }
        </app-card-content>
      </app-card>

      <div class="mt-8 flex gap-6 text-sm text-gray-500 dark:text-gray-400">
        <a href="#" class="hover:text-gray-900 dark:hover:text-gray-100">{{ 'AUTH.FORGOT_PASSWORD.PRIVACY' | translate }}</a>
        <a href="#" class="hover:text-gray-900 dark:hover:text-gray-100">{{ 'AUTH.FORGOT_PASSWORD.TERMS' | translate }}</a>
        <a href="#" class="hover:text-gray-900 dark:hover:text-gray-100">{{ 'AUTH.FORGOT_PASSWORD.CONTACT' | translate }}</a>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);

  email = '';
  isLoading = signal(false);
  isSubmitted = signal(false);
  devResetLink = signal<string | null>(null);

  async handleSubmit(): Promise<void> {
    this.isLoading.set(true);
    await this.authService.forgotPassword(this.email);
    this.isLoading.set(false);
    this.isSubmitted.set(true);

    // In dev mode, try to fetch the reset link from the dev store
    const devLink = await this.authService.getDevLastResetLink(this.email);
    if (devLink) {
      this.devResetLink.set(devLink);
    }
  }

  navigateDevLink(): void {
    const link = this.devResetLink();
    if (link) window.location.assign(link);
  }
}
