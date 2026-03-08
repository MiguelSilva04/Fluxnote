import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../../core/services';
import {
  ButtonComponent,
  InputComponent,
  CardComponent,
  CardContentComponent,
} from '../../../../shared/components/ui';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-reset-password',
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
    <div
      class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4"
    >
      <div class="mb-8 text-center">
        <div
          class="inline-flex items-center justify-center p-3 bg-[#155347] rounded-xl mb-4 shadow-lg shadow-[#155347]/20"
        >
          <lucide-icon name="file-text" class="h-8 w-8 text-white"></lucide-icon>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">FluxNote</h1>
      </div>

      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8">
          <!-- Invalid link -->
          @if (invalidLink()) {
            <div class="text-center py-4">
              <div
                class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6"
              >
                <lucide-icon name="circle-alert" class="h-8 w-8 text-red-600"></lucide-icon>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {{ 'AUTH.RESET_PASSWORD.INVALID_LINK' | translate }}
              </h2>
              <p class="text-gray-600 dark:text-gray-400 mb-8">
                {{ 'AUTH.RESET_PASSWORD.INVALID_LINK_DESC' | translate }}
              </p>
              <a routerLink="/forgot-password">
                <app-button customClass="w-full" size="lg">
                  {{ 'AUTH.RESET_PASSWORD.REQUEST_NEW' | translate }}
                </app-button>
              </a>
            </div>
          }

          <!-- Success -->
          @else if (isSuccess()) {
            <div class="text-center py-4">
              <div
                class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6"
              >
                <lucide-icon name="badge-check" class="h-8 w-8 text-green-600"></lucide-icon>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {{ 'AUTH.RESET_PASSWORD.SUCCESS_TITLE' | translate }}
              </h2>
              <p class="text-gray-600 dark:text-gray-400 mb-8">
                {{ 'AUTH.RESET_PASSWORD.SUCCESS_DESC' | translate }}
              </p>
              <a routerLink="/login">
                <app-button customClass="w-full" size="lg">
                  {{ 'AUTH.RESET_PASSWORD.GO_TO_LOGIN' | translate }}
                </app-button>
              </a>
            </div>
          }

          <!-- Reset form -->
          @else {
            <a
              routerLink="/login"
              class="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
            >
              <lucide-icon name="arrow-left" class="h-4 w-4 mr-1"></lucide-icon>
              {{ 'AUTH.RESET_PASSWORD.BACK_LOGIN' | translate }}
            </a>

            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {{ 'AUTH.RESET_PASSWORD.TITLE' | translate }}
            </h2>
            <p class="text-gray-600 dark:text-gray-400 mb-8">
              {{ 'AUTH.RESET_PASSWORD.SUBTITLE' | translate }}
            </p>

            @if (errorMessage()) {
              <div
                class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <div class="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
                  <lucide-icon name="circle-alert" class="h-4 w-4"></lucide-icon>
                  <span class="text-sm font-medium">{{ errorMessage() }}</span>
                </div>
                @for (err of errors(); track err) {
                  <p class="text-xs text-red-600 dark:text-red-400 ml-6">{{ err }}</p>
                }
              </div>
            }

            <form (ngSubmit)="handleSubmit()" class="space-y-5">
              <div class="space-y-2">
                <div class="relative">
                  <app-input
                    [label]="'AUTH.RESET_PASSWORD.NEW_PASSWORD' | translate"
                    [type]="showPassword() ? 'text' : 'password'"
                    [placeholder]="'AUTH.RESET_PASSWORD.NEW_PASSWORD_PLACEHOLDER' | translate"
                    [ngModel]="newPassword()"
                    (ngModelChange)="newPassword.set($event)"
                    name="newPassword"
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
                <app-input
                  [label]="'AUTH.RESET_PASSWORD.CONFIRM_PASSWORD' | translate"
                  [type]="showConfirmPassword() ? 'text' : 'password'"
                  [placeholder]="'AUTH.RESET_PASSWORD.CONFIRM_PASSWORD_PLACEHOLDER' | translate"
                  [ngModel]="confirmPassword()"
                  (ngModelChange)="confirmPassword.set($event)"
                  name="confirmPassword"
                  [hasLeftIcon]="true"
                  [hasRightIcon]="true"
                  [required]="true"
                  [customClass]="
                    !validations().match && confirmPassword() ? 'border-red-300' : ''
                  "
                >
                  <lucide-icon leftIcon name="lock" class="h-4 w-4"></lucide-icon>
                  <button
                    rightIcon
                    type="button"
                    (click)="showConfirmPassword.set(!showConfirmPassword())"
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <lucide-icon
                      [name]="showConfirmPassword() ? 'eye-off' : 'eye'"
                      class="h-4 w-4"
                    ></lucide-icon>
                  </button>
                </app-input>
                @if (confirmPassword() && !validations().match) {
                  <p class="text-xs text-red-500 pl-1">{{ 'AUTH.REGISTER.PASSWORDS_NO_MATCH' | translate }}</p>
                }
              </div>

              <app-button
                type="submit"
                customClass="w-full mt-2"
                size="lg"
                [isLoading]="isLoading()"
                [disabled]="!isFormValid()"
              >
                {{ 'AUTH.RESET_PASSWORD.SUBMIT' | translate }}
              </app-button>
            </form>
          }
        </app-card-content>
      </app-card>
    </div>
  `,
})
export class ResetPasswordComponent {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  newPassword = signal('');
  confirmPassword = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);
  isSuccess = signal(false);
  invalidLink = signal(false);
  errorMessage = signal<string | null>(null);
  errors = signal<string[]>([]);

  validations = computed(() => {
    const pwd = this.newPassword();
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

  private userId = '';
  private token = '';

  ngOnInit(): void {
    this.userId = this.route.snapshot.queryParamMap.get('userId') ?? '';
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.userId || !this.token) {
      this.invalidLink.set(true);
    }
  }

  async handleSubmit(): Promise<void> {
    this.errorMessage.set(null);
    this.errors.set([]);

    if (!this.isFormValid()) return;

    this.isLoading.set(true);
    const result = await this.authService.resetPassword(
      this.userId,
      this.token,
      this.newPassword(),
      this.confirmPassword()
    );
    this.isLoading.set(false);

    if (result.success) {
      this.isSuccess.set(true);
    } else {
      this.errorMessage.set(result.message ?? 'Password reset failed.');
      this.errors.set(result.errors ?? []);
    }
  }
}
