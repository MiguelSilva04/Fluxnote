import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/services';
import {
  ButtonComponent,
  InputComponent,
  CardComponent,
  CardContentComponent,
} from '../../../../shared/components/ui';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    TranslateModule,
    ButtonComponent,
    InputComponent,
    CardComponent,
    CardContentComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 relative">
      <a routerLink="/" class="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-[#155347] dark:hover:text-emerald-400 transition-colors">
        <lucide-icon name="arrow-left" class="h-4 w-4"></lucide-icon>
        {{ 'AUTH.BACK_TO_LANDING' | translate }}
      </a>
      <div class="mb-8 text-center">
        <div
          class="inline-flex items-center justify-center p-3 bg-[#155347] rounded-xl mb-4 shadow-lg shadow-[#155347]/20"
        >
          
          <img src="assets/white_icon.png" alt="FluxNote" class="h-10 w-10" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{{ 'AUTH.REGISTER.TITLE' | translate }}</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">{{ 'AUTH.REGISTER.SUBTITLE' | translate }}</p>
      </div>

      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8">
          <h2 class="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-8">{{ 'AUTH.REGISTER.HEADING' | translate }}</h2>

          <form (ngSubmit)="handleSubmit()" class="space-y-5">
            <app-input
              [label]="'AUTH.REGISTER.FULL_NAME' | translate"
              [placeholder]="'AUTH.REGISTER.FULL_NAME_PLACEHOLDER' | translate"
              [ngModel]="fullName()"
              (ngModelChange)="fullName.set($event)"
              name="fullName"
              [hasLeftIcon]="true"
              [required]="true"
            >
              <lucide-icon leftIcon name="user" class="h-4 w-4"></lucide-icon>
            </app-input>

            <app-input
              [label]="'AUTH.REGISTER.EMAIL' | translate"
              type="email"
              [placeholder]="'AUTH.REGISTER.EMAIL_PLACEHOLDER' | translate"
              [ngModel]="email()"
              (ngModelChange)="email.set($event)"
              name="email"
              [hasLeftIcon]="true"
              [required]="true"
            >
              <lucide-icon leftIcon name="mail" class="h-4 w-4"></lucide-icon>
            </app-input>

            <div class="space-y-2">
              <div class="relative">
                <app-input
                  [label]="'AUTH.REGISTER.PASSWORD' | translate"
                  [type]="showPassword() ? 'text' : 'password'"
                  [placeholder]="'AUTH.LOGIN.PASSWORD_PLACEHOLDER' | translate"
                  [ngModel]="password()"
                  (ngModelChange)="password.set($event)"
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
                  <lucide-icon
                    [name]="showPassword() ? 'eye-off' : 'eye'"
                    class="h-4 w-4"
                  ></lucide-icon>
                </button>
              </div>

              <div class="grid grid-cols-2 gap-2 pl-1">
                <div
                  [class]="
                    'flex items-center gap-2 text-xs ' +
                    (validations().length ? 'text-green-600' : 'text-gray-400')
                  "
                >
                  @if (validations().length) {
                    <lucide-icon name="check" class="h-3 w-3"></lucide-icon>
                  } @else {
                    <div class="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600"></div>
                  }
                  <span>{{ 'AUTH.REGISTER.MIN_CHARS' | translate }}</span>
                </div>
                <div
                  [class]="
                    'flex items-center gap-2 text-xs ' +
                    (validations().number ? 'text-green-600' : 'text-gray-400')
                  "
                >
                  @if (validations().number) {
                    <lucide-icon name="check" class="h-3 w-3"></lucide-icon>
                  } @else {
                    <div class="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600"></div>
                  }
                  <span>{{ 'AUTH.REGISTER.ONE_NUMBER' | translate }}</span>
                </div>
                <div
                  [class]="
                    'flex items-center gap-2 text-xs ' +
                    (validations().special ? 'text-green-600' : 'text-gray-400')
                  "
                >
                  @if (validations().special) {
                    <lucide-icon name="check" class="h-3 w-3"></lucide-icon>
                  } @else {
                    <div class="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600"></div>
                  }
                  <span>{{ 'AUTH.REGISTER.ONE_SPECIAL' | translate }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div class="relative">
                <app-input
                  [label]="'AUTH.REGISTER.CONFIRM_PASSWORD' | translate"
                  [type]="showConfirmPassword() ? 'text' : 'password'"
                  [placeholder]="'AUTH.LOGIN.PASSWORD_PLACEHOLDER' | translate"
                  [ngModel]="confirmPassword()"
                  (ngModelChange)="confirmPassword.set($event)"
                  name="confirmPassword"
                  [required]="true"
                  [customClass]="
                    !validations().match && confirmPassword() ? 'border-red-300' : ''
                  "
                ></app-input>
                <button
                  type="button"
                  (click)="showConfirmPassword.set(!showConfirmPassword())"
                  class="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <lucide-icon
                    [name]="showConfirmPassword() ? 'eye-off' : 'eye'"
                    class="h-4 w-4"
                  ></lucide-icon>
                </button>
              </div>
              @if (confirmPassword() && !validations().match) {
                <p class="text-xs text-red-500 pl-1">{{ 'AUTH.REGISTER.PASSWORDS_NO_MATCH' | translate }}</p>
              }
            </div>

            <app-button
              type="submit"
              customClass="w-full mt-4"
              size="lg"
              [isLoading]="isLoading()"
              [disabled]="!isFormValid()"
            >
              {{ 'AUTH.REGISTER.CREATE_BTN' | translate }}
            </app-button>
          </form>

          <div class="mt-8">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <span class="w-full border-t border-gray-200 dark:border-gray-700"></span>
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">{{ 'AUTH.REGISTER.OR' | translate }}</span>
              </div>
            </div>

            <div class="mt-6 grid grid-cols-2 gap-3">
              <app-button
                variant="outline"
                customClass="w-full"
                [leftIcon]="true"
                (onClick)="registerWithGoogle()"
              >
                <svg leftIcon class="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {{ 'AUTH.REGISTER.GOOGLE' | translate }}
              </app-button>
              <app-button
                variant="outline"
                customClass="w-full"
                [leftIcon]="true"
                (onClick)="registerWithMicrosoft()"
              >
                <svg leftIcon class="h-5 w-5" viewBox="0 0 23 23">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                {{ 'AUTH.REGISTER.MICROSOFT' | translate }}
              </app-button>
            </div>
          </div>

          <p class="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            {{ 'AUTH.REGISTER.HAS_ACCOUNT' | translate }}
            <a routerLink="/login" class="font-medium text-[#155347] hover:underline ml-1">
              {{ 'AUTH.REGISTER.LOG_IN' | translate }}
            </a>
          </p>
        </app-card-content>
      </app-card>
    </div>
  `,
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private translateService = inject(TranslateService);

  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = this.authService.isLoading;
  
  // Campos reativos usando signals
  fullName = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');

  // Objeto formData para compatibilidade com ngModel
  get formData() {
    return {
      fullName: this.fullName(),
      email: this.email(),
      password: this.password(),
      confirmPassword: this.confirmPassword(),
    };
  }

  validations = computed(() => {
    const pwd = this.password();
    const confirmPwd = this.confirmPassword();
    
    return {
      length: pwd.length >= 8,
      number: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      match: pwd === confirmPwd && pwd !== '',
    };
  });

  isFormValid = computed(() => {
    const v = this.validations();
    return v.length && v.number && v.special && v.match;
  });

  private readonly errorMap: Record<string, string> = {
    'Email is already registered.': 'TOASTS.REGISTER_EMAIL_EXISTS',
    'User creation failed.': 'TOASTS.REGISTER_CREATION_FAILED',
    'Passwords must be at least 8 characters.': 'TOASTS.REGISTER_PASSWORD_LENGTH',
    'Passwords must have at least one digit': 'TOASTS.REGISTER_PASSWORD_NUMBER',
    'Passwords must have at least one non alphanumeric character.': 'TOASTS.REGISTER_PASSWORD_SPECIAL',
    'Passwords must have at least one uppercase': 'TOASTS.REGISTER_PASSWORD_UPPERCASE',
    'Passwords must have at least one lowercase': 'TOASTS.REGISTER_PASSWORD_LOWERCASE',
  };

  private translateError(error: string): string {
    const key = this.errorMap[error];
    return key ? this.translateService.instant(key) : error;
  }

  async handleSubmit(): Promise<void> {
    if (!this.isFormValid()) {
      this.toastService.warning(this.translateService.instant('TOASTS.REGISTER_FILL_FIELDS'));
      return;
    }

    const result = await this.authService.register(
      this.fullName(),
      this.email(),
      this.password(),
    );

    if (result.errors && result.errors.length > 0) {
      result.errors.forEach((error: string) => {
        this.toastService.error(this.translateError(error));
      });
    } else if (result.status === 'error') {
      this.toastService.error(this.translateError(result.message) || this.translateService.instant('TOASTS.REGISTER_FAILED'));
    } else {
      this.toastService.success(this.translateService.instant('TOASTS.REGISTER_SUCCESS'));
      this.router.navigate(['/pending-email'], {
        queryParams: { email: this.email() },
        state: { fromRegistration: true }
      });
    }
  }

  registerWithGoogle(): void {
    this.authService.externalLogin('google');
  }

  registerWithMicrosoft(): void {
    this.authService.externalLogin('microsoft');
  }
}
