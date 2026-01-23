import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardComponent, CardContentComponent } from '../../../../shared/components/ui';

@Component({
  selector: 'app-pending-email',
  standalone: true,
  imports: [CommonModule, RouterLink, CardComponent, CardContentComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Confirm your email</h1>
          <p class="text-gray-600 mb-6">
            We've sent a confirmation link to <b>{{ email }}</b>.
          </p>
          <p class="text-gray-500 text-sm mb-6">
            In development, the link may be in the backend logs.
          </p>
          <a routerLink="/login" class="text-[#155347] font-medium hover:underline">
            Go to login
          </a>
        </app-card-content>
      </app-card>
    </div>
  `
})
export class PendingEmailComponent {
  email = '';
  constructor(route: ActivatedRoute) {
    this.email = route.snapshot.queryParamMap.get('email') ?? '';
  }
}
