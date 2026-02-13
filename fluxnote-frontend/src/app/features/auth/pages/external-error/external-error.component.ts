import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardComponent, CardContentComponent, ButtonComponent } from '../../../../shared/components/ui';

@Component({
  selector: 'app-external-error',
  standalone: true,
  imports: [CommonModule, CardComponent, CardContentComponent, ButtonComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8 text-center">
          <h1 class="text-2xl font-bold text-gray-900 mb-3">Login social indisponível</h1>
          <p class="text-sm text-gray-600 mb-6">{{ message }}</p>
          <app-button customClass="w-full" (onClick)="goToLogin()">Voltar ao login</app-button>
        </app-card-content>
      </app-card>
    </div>
  `
})
export class ExternalErrorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly message: string;

  constructor() {
    const error = this.route.snapshot.queryParamMap.get('error');
    const description = this.route.snapshot.queryParamMap.get('error_description');
    this.message = description || error || 'Ocorreu um erro no processo de autenticação externa.';
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
