import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CardComponent, CardContentComponent } from '../../../../shared/components/ui';
import { AuthService } from '../../../../core/services';

@Component({
  selector: 'app-pending-email',
  standalone: true,
  imports: [CommonModule, CardComponent, CardContentComponent],
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
          @if (link) {
            <button
              type="button"
              (click)="confirmEmail()"
              class="w-full py-2 px-4 rounded-md bg-[#155347] text-white font-medium hover:bg-[#0f3f35] transition-colors"
            >
              Confirm email
            </button>
          } @else {
            <p class="text-sm text-gray-500 mb-2 cursor-pointer">Click here to reveal the button🪄</p>
          }
          <!--<a routerLink="/login" class="block mt-4 text-[#155347] font-medium hover:underline">
            Go to login
          </a>-->
        </app-card-content>
      </app-card>
    </div>
  `
})
export class PendingEmailComponent {
  email = '';
  link = '';
  private authService = inject(AuthService);

  constructor(route: ActivatedRoute) {
    this.email = route.snapshot.queryParamMap.get('email') ?? '';
  }

  async ngOnInit() {
    // chama o método e atribui o resultado
    this.link = await this.authService.getDevLastConfirmationLink(this.email) ?? '';
  }

  // OU se quiser manter o método separado:
  async loadLink(): Promise<string | null> {
    // retorna o valor
    return await this.authService.getDevLastConfirmationLink(this.email);
  }

  confirmEmail(): void {
    if (!this.link) return;
    window.location.assign(this.link);
  }
}
