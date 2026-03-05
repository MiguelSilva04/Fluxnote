import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services';
import { CardComponent, CardContentComponent, ButtonComponent } from '../../../../shared/components/ui';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, RouterLink, CardComponent, CardContentComponent, ButtonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Email confirmation</h1>

          @if (loading()) {
            <p class="text-gray-600 dark:text-gray-400">Confirming...</p>
          } @else if (error()) {
            <p class="text-red-600">{{ error() }}</p>
          } @else {
            <p class="text-green-700">{{ message() }}</p>
            <a routerLink="/login" class="mt-6 block">
              <app-button customClass="w-full" size="lg">Go to Login</app-button>
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

  loading = signal(true);
  message = signal<string | null>(null);
  error = signal<string | null>(null);

  async ngOnInit() {
    const userId = this.route.snapshot.queryParamMap.get('userId');
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!userId || !token) {
      this.loading.set(false);
      this.error.set('Link inválido (parâmetros em falta).');
      return;
    }

    try {
      const res = await this.auth.confirmEmail(userId, token);
      this.message.set(res.message ?? 'Email confirmado com sucesso.');
      this.loading.set(false);

      setTimeout(() => {
        this.router.navigate(['/login'], { queryParams: { confirmed: 1 } });
      }, 600);
    } catch (err: any) {
      this.loading.set(false);
      this.error.set(err?.error?.message ?? 'Failed to confirm email.');
    }
  }
}
