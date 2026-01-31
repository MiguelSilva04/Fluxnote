import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../../core/services';
import { ButtonComponent, InputComponent, CardComponent, CardContentComponent } from '../../../../shared/components/ui';

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
    CardContentComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div class="mb-8 text-center">
        <div class="inline-flex items-center justify-center p-3 bg-[#155347] rounded-xl mb-4 shadow-lg shadow-[#155347]/20">
          <lucide-icon name="file-text" class="h-8 w-8 text-white"></lucide-icon>
        </div>
        <h1 class="text-3xl font-bold text-gray-900">FluxNote</h1>
      </div>

      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8">
          <a routerLink="/login" class="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
            <lucide-icon name="arrow-left" class="h-4 w-4 mr-1"></lucide-icon>
            Back to Login
          </a>

          @if (!isSubmitted()) {
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p class="text-gray-600 mb-8">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form (ngSubmit)="handleSubmit()" class="space-y-6">
              <app-input
                label="Email"
                type="email"
                placeholder="your.email&#64;example.com"
                [(ngModel)]="email"
                name="email"
                [hasLeftIcon]="true"
                [required]="true"
              >
                <lucide-icon leftIcon name="mail" class="h-4 w-4"></lucide-icon>
              </app-input>

              <app-button type="submit" customClass="w-full" size="lg" [isLoading]="isLoading()">
                Send Recovery Link
              </app-button>
            </form>
          } @else {
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <lucide-icon name="badge-check" class="h-8 w-8 text-green-600"></lucide-icon>
              </div>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
              <p class="text-gray-600 mb-8">
                We've sent a password reset link to
                <span class="font-medium text-gray-900">{{ email }}</span>
              </p>
              <app-button variant="outline" customClass="w-full" (onClick)="isSubmitted.set(false)">
                Try another email
              </app-button>
            </div>
          }
        </app-card-content>
      </app-card>

      <div class="mt-8 flex gap-6 text-sm text-gray-500">
        <a href="#" class="hover:text-gray-900">Privacy Policy</a>
        <a href="#" class="hover:text-gray-900">Terms of Service</a>
        <a href="#" class="hover:text-gray-900">Contact Support</a>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);

  email = '';
  isLoading = signal(false);
  isSubmitted = signal(false);

  async handleSubmit(): Promise<void> {
    this.isLoading.set(true);
    await this.authService.forgotPassword(this.email);
    this.isLoading.set(false);
    this.isSubmitted.set(true);
  }
}
