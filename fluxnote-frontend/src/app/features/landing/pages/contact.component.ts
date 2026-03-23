import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, TranslateModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="py-20 bg-gradient-to-br from-[#155347]/10 to-white dark:to-gray-900">
        <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div class="text-6xl mb-6">📬</div>
          <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            {{ 'LANDING.CONTACT.TITLE' | translate }}
          </h1>
          <div class="bg-[#155347] text-white text-sm font-semibold px-4 py-1.5 rounded-full inline-block mb-8">
            {{ 'LANDING.CONTACT.COMING_SOON' | translate }}
          </div>
          <p class="text-xl text-gray-600 dark:text-gray-400 mb-4">
            {{ 'LANDING.CONTACT.ACADEMIC_TEXT' | translate }}
            <strong class="text-gray-800 dark:text-gray-200">{{ 'LANDING.CONTACT.SCHOOL' | translate }}</strong>.
          </p>
          <p class="text-lg text-gray-600 dark:text-gray-400 mb-12">
            {{ 'LANDING.CONTACT.NO_CHANNEL' | translate }}
          </p>
          <button
            (click)="goHome()"
            class="bg-[#155347] text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            {{ 'LANDING.CONTACT.BACK_HOME' | translate }}
          </button>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class ContactPageComponent {
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/']);
  }
}
