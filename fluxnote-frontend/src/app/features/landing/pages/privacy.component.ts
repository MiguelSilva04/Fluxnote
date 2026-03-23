import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, TranslateModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="py-20">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              {{ 'LANDING.PRIVACY.TITLE' | translate }}
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-400">
              {{ 'LANDING.PRIVACY.UPDATED' | translate }}
            </p>
          </div>

          <div class="prose prose-lg max-w-none">
            <div class="bg-[#155347]/10 border border-[#155347]/30 rounded-2xl p-8 mb-8">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.PRIVACY.SUMMARY_TITLE' | translate }}</h2>
              <p class="text-gray-700 dark:text-gray-300">
                {{ 'LANDING.PRIVACY.SUMMARY_TEXT' | translate }}
              </p>
            </div>

            <div class="space-y-8">
              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.PRIVACY.S1_TITLE' | translate }}</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.PRIVACY.S1_ACCOUNT_TITLE' | translate }}</h3>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                    <li>{{ 'LANDING.PRIVACY.S1_ACCOUNT_1' | translate }}</li>
                    <li>{{ 'LANDING.PRIVACY.S1_ACCOUNT_2' | translate }}</li>
                    <li>{{ 'LANDING.PRIVACY.S1_ACCOUNT_3' | translate }}</li>
                  </ul>
                </div>

                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mt-4">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.PRIVACY.S1_CONTENT_TITLE' | translate }}</h3>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                    <li>{{ 'LANDING.PRIVACY.S1_CONTENT_1' | translate }}</li>
                    <li>{{ 'LANDING.PRIVACY.S1_CONTENT_2' | translate }}</li>
                    <li>{{ 'LANDING.PRIVACY.S1_CONTENT_3' | translate }}</li>
                  </ul>
                </div>

                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mt-4">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.PRIVACY.S1_USAGE_TITLE' | translate }}</h3>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                    <li>{{ 'LANDING.PRIVACY.S1_USAGE_1' | translate }}</li>
                    <li>{{ 'LANDING.PRIVACY.S1_USAGE_2' | translate }}</li>
                    <li>{{ 'LANDING.PRIVACY.S1_USAGE_3' | translate }}</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.PRIVACY.S2_TITLE' | translate }}</h2>
                <div class="grid md:grid-cols-2 gap-6">
                  <div class="bg-[#155347]/10 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.PRIVACY.S2_SERVICE_TITLE' | translate }}</h3>
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>{{ 'LANDING.PRIVACY.S2_SERVICE_1' | translate }}</li>
                      <li>{{ 'LANDING.PRIVACY.S2_SERVICE_2' | translate }}</li>
                      <li>{{ 'LANDING.PRIVACY.S2_SERVICE_3' | translate }}</li>
                    </ul>
                  </div>

                  <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.PRIVACY.S2_IMPROVE_TITLE' | translate }}</h3>
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>{{ 'LANDING.PRIVACY.S2_IMPROVE_1' | translate }}</li>
                      <li>{{ 'LANDING.PRIVACY.S2_IMPROVE_2' | translate }}</li>
                      <li>{{ 'LANDING.PRIVACY.S2_IMPROVE_3' | translate }}</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.PRIVACY.S3_TITLE' | translate }}</h2>
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.PRIVACY.S3_NEVER_TITLE' | translate }}</h3>
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    {{ 'LANDING.PRIVACY.S3_NEVER_TEXT' | translate }}
                  </p>
                  <p class="text-gray-700 dark:text-gray-300">
                    {{ 'LANDING.PRIVACY.S3_SHARE_INTRO' | translate }}
                  </p>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 mt-3 space-y-1">
                    <li>{{ 'LANDING.PRIVACY.S3_SHARE_1' | translate }}</li>
                    <li>{{ 'LANDING.PRIVACY.S3_SHARE_2' | translate }}</li>
                    <li>{{ 'LANDING.PRIVACY.S3_SHARE_3' | translate }}</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.PRIVACY.S4_TITLE' | translate }}</h2>
                <div class="grid md:grid-cols-3 gap-6">
                  <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
                    <div class="text-3xl mb-3">🔒</div>
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ 'LANDING.PRIVACY.S4_ENCRYPTION_TITLE' | translate }}</h3>
                    <p class="text-gray-700 dark:text-gray-300 text-sm">{{ 'LANDING.PRIVACY.S4_ENCRYPTION_DESC' | translate }}</p>
                  </div>

                  <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
                    <div class="text-3xl mb-3">🛡️</div>
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ 'LANDING.PRIVACY.S4_ACCESS_TITLE' | translate }}</h3>
                    <p class="text-gray-700 dark:text-gray-300 text-sm">{{ 'LANDING.PRIVACY.S4_ACCESS_DESC' | translate }}</p>
                  </div>

                  <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
                    <div class="text-3xl mb-3">🔍</div>
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ 'LANDING.PRIVACY.S4_MONITORING_TITLE' | translate }}</h3>
                    <p class="text-gray-700 dark:text-gray-300 text-sm">{{ 'LANDING.PRIVACY.S4_MONITORING_DESC' | translate }}</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.PRIVACY.S5_TITLE' | translate }}</h2>
                <div class="bg-[#155347]/10 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    {{ 'LANDING.PRIVACY.S5_INTRO' | translate }}
                  </p>
                  <div class="grid md:grid-cols-2 gap-4">
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>{{ 'LANDING.PRIVACY.S5_RIGHT_1' | translate }}</li>
                      <li>{{ 'LANDING.PRIVACY.S5_RIGHT_2' | translate }}</li>
                      <li>{{ 'LANDING.PRIVACY.S5_RIGHT_3' | translate }}</li>
                    </ul>
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>{{ 'LANDING.PRIVACY.S5_RIGHT_4' | translate }}</li>
                      <li>{{ 'LANDING.PRIVACY.S5_RIGHT_5' | translate }}</li>
                      <li>{{ 'LANDING.PRIVACY.S5_RIGHT_6' | translate }}</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.PRIVACY.S6_TITLE' | translate }}</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300">
                    {{ 'LANDING.PRIVACY.S6_TEXT' | translate }}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class PrivacyPageComponent {}
