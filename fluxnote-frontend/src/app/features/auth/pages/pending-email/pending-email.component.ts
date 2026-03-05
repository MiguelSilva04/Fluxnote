import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CardComponent, CardContentComponent } from '../../../../shared/components/ui';
import { AuthService } from '../../../../core/services';

@Component({
  selector: 'app-pending-email',
  standalone: true,
  imports: [CommonModule, TranslateModule, CardComponent, CardContentComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <app-card customClass="w-full max-w-md shadow-xl border-0">
        <app-card-content customClass="p-8">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'AUTH.PENDING_EMAIL.TITLE' | translate }}</h1>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{ 'AUTH.PENDING_EMAIL.SUBTITLE' | translate }} <b>{{ email }}</b>.
          </p>
          @if (loading) {
            <p class="text-gray-400 dark:text-gray-500 text-sm">{{ 'AUTH.PENDING_EMAIL.LOADING' | translate }}</p>
          } @else if (isDev) {
            @if (link) {
              <button
                type="button"
                (click)="confirmEmail()"
                class="w-full py-2 px-4 rounded-md bg-[#155347] text-white font-medium hover:bg-[#0f3f35] transition-colors"
              >
                {{ 'AUTH.PENDING_EMAIL.CONFIRM_BTN' | translate }}
              </button>
            }
          } @else {
            <p class="text-gray-500 dark:text-gray-400 text-sm">
              {{ 'AUTH.PENDING_EMAIL.CHECK_INBOX' | translate }}
            </p>
          }
        </app-card-content>
      </app-card>
    </div>
  `
})
export class PendingEmailComponent {
  email = '';
  link = '';
  isDev = false;
  loading = true;
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  constructor(route: ActivatedRoute) {
    this.email = route.snapshot.queryParamMap.get('email') ?? '';
  }

  async ngOnInit() {
    const devLink = await this.authService.getDevLastConfirmationLink(this.email);
    if (devLink) {
      this.isDev = true;
      this.link = devLink;
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  confirmEmail(): void {
    if (!this.link) return;
    window.location.assign(this.link);
  }
}
