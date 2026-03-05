import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services';
import { ButtonComponent, InputComponent, CardComponent, CardContentComponent } from '../../../../shared/components/ui';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-login',
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
    TranslateModule,
  ],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div class="mb-8 text-center">
        <div class="inline-flex items-center justify-center p-3 bg-[#155347] rounded-xl mb-4 shadow-lg shadow-[#155347]/20">
        <img src="assets/white_icon.png" alt="FluxNote" class="h-10 w-10" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ 'AUTH.LOGIN.TITLE' | translate }}</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">{{ 'AUTH.LOGIN.SUBTITLE' | translate }}</p>
      </div>

      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8">
          <h2 class="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">{{ 'AUTH.LOGIN.HEADING' | translate }}</h2>

          <form (ngSubmit)="handleSubmit()" class="space-y-5">
            <div class="relative">
              <app-input
                [label]="'AUTH.LOGIN.EMAIL' | translate"
                type="email"
                [placeholder]="'AUTH.LOGIN.EMAIL_PLACEHOLDER' | translate"
                [(ngModel)]="formData.email"
                name="email"
                [hasLeftIcon]="true"
                [required]="true"
              >
                <lucide-icon leftIcon name="mail" class="h-4 w-4"></lucide-icon>
              </app-input>
            </div>

            <div class="relative">
              <app-input
                [label]="'AUTH.LOGIN.PASSWORD' | translate"
                [type]="showPassword() ? 'text' : 'password'"
                [placeholder]="'AUTH.LOGIN.PASSWORD_PLACEHOLDER' | translate"
                [(ngModel)]="formData.password"
                name="password"
                [hasLeftIcon]="true"
                [required]="true"
              >
                <lucide-icon leftIcon name="lock" class="h-4 w-4"></lucide-icon>
              </app-input>
              <button
                type="button"
                (click)="showPassword.set(!showPassword())"
                class="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <lucide-icon [name]="showPassword() ? 'eye-off' : 'eye'" class="h-4 w-4"></lucide-icon>
              </button>
            </div>

            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center gap-2 cursor-pointer">
                <input name="rememberMe" [(ngModel)]="formData.rememberMe" type="checkbox" class="rounded border-gray-300 dark:border-gray-600 text-[#155347] focus:ring-[#155347]" />
                <span class="text-gray-600 dark:text-gray-400">{{ 'AUTH.LOGIN.REMEMBER_ME' | translate }}</span>
              </label>
              <a routerLink="/forgot-password" class="text-[#155347] hover:underline font-medium">
                {{ 'AUTH.LOGIN.FORGOT_PASSWORD' | translate }}
              </a>
            </div>

            <app-button type="submit" customClass="w-full" size="lg" [isLoading]="isLoading()">
              {{ 'AUTH.LOGIN.LOGIN_BTN' | translate }}
            </app-button>
          </form>

          <div class="mt-8">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <span class="w-full border-t border-gray-200 dark:border-gray-700"></span>
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">{{ 'AUTH.LOGIN.OR_CONTINUE' | translate }}</span>
              </div>
            </div>

            <div class="mt-6 space-y-3">
              <app-button
                variant="outline"
                customClass="w-full relative"
                [leftIcon]="true"
                (onClick)="loginWithGoogle()"
              >
                <svg leftIcon class="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {{ 'AUTH.LOGIN.GOOGLE' | translate }}
              </app-button>
              <app-button
                variant="outline"
                customClass="w-full"
                [leftIcon]="true"
                (onClick)="loginWithMicrosoft()"
              >
                <svg leftIcon class="h-5 w-5" viewBox="0 0 23 23">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                {{ 'AUTH.LOGIN.MICROSOFT' | translate }}
              </app-button>
            </div>
          </div>

          <p class="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            {{ 'AUTH.LOGIN.NO_ACCOUNT' | translate }}
            <a routerLink="/register" class="font-medium text-[#155347] hover:underline ml-1">
              {{ 'AUTH.LOGIN.CREATE_ACCOUNT' | translate }}
            </a>
          </p>
        </app-card-content>
      </app-card>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private translateService = inject(TranslateService);

  showPassword = signal(false);
  isLoading = this.authService.isLoading;
  formData = { email: '', password: '', rememberMe: false };

  async handleSubmit(): Promise<void> {
    const result = await this.authService.login(
      this.formData.email,
      this.formData.password,
      this.formData.rememberMe
    );

    if (result.success) {
      this.toastService.success(this.translateService.instant('TOASTS.LOGIN_SUCCESS'));
      const returnUrl = this.route.snapshot.queryParams['returnUrl'];
      if (returnUrl) {
        this.router.navigateByUrl(returnUrl);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } else {
      // mostra erros do backend usando o toast service
      if (result.errors && result.errors.length > 0) {
        // mostra todos os erros
        result.errors.forEach(error => {
          this.toastService.error(error);
        });
      } else {
        // mostra mensagem principal se não houver erros detalhados
        this.toastService.error(result.message || this.translateService.instant('TOASTS.LOGIN_FAILED'));
      }
    }
  }

  loginWithGoogle(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    this.authService.externalLogin('google', returnUrl);
  }

  loginWithMicrosoft(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    this.authService.externalLogin('microsoft', returnUrl);
  }
}
