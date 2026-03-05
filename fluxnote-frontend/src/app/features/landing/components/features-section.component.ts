import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-features-section',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <section id="funcionalidades" class="py-20 bg-gray-50 dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {{ 'LANDING.FEATURES.TITLE' | translate }}
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            {{ 'LANDING.FEATURES.SUBTITLE' | translate }}
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          @for (feature of features; track feature.titleKey) {
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div class="text-[#155347] dark:text-emerald-400 mb-4" [innerHTML]="feature.icon"></div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {{ feature.titleKey | translate }}
              </h3>
              <p class="text-gray-600 dark:text-gray-400">
                {{ feature.descKey | translate }}
              </p>
            </div>
          }
        </div>

        <div class="text-center">
          <button
            (click)="goToLogin()"
            class="bg-[#155347] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-[#155347] transition-colors shadow-lg cursor-pointer"
          >
            {{ 'LANDING.FEATURES.GET_STARTED' | translate }}
          </button>
        </div>
      </div>
    </section>
  `
})
export class FeaturesSectionComponent {
  features = [
    {
      icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>`,
      titleKey: 'LANDING.FEATURES.AI_TITLE',
      descKey: 'LANDING.FEATURES.AI_DESC'
    },
    {
      icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>`,
      titleKey: 'LANDING.FEATURES.COLLAB_TITLE',
      descKey: 'LANDING.FEATURES.COLLAB_DESC'
    },
    {
      icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`,
      titleKey: 'LANDING.FEATURES.VERSION_TITLE',
      descKey: 'LANDING.FEATURES.VERSION_DESC'
    },
    {
      icon: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>`,
      titleKey: 'LANDING.FEATURES.SHARING_TITLE',
      descKey: 'LANDING.FEATURES.SHARING_DESC'
    }
  ];

  constructor(private router: Router) {}

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
