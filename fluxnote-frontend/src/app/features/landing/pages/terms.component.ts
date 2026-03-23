import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, TranslateModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="py-20">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              {{ 'LANDING.TERMS.TITLE' | translate }}
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-400">
              {{ 'LANDING.TERMS.UPDATED' | translate }}
            </p>
          </div>

          <div class="prose prose-lg max-w-none">
            <div class="bg-[#155347]/10 border border-[#155347]/30 rounded-2xl p-8 mb-8">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.TERMS.WELCOME_TITLE' | translate }}</h2>
              <p class="text-gray-700 dark:text-gray-300">
                {{ 'LANDING.TERMS.WELCOME_TEXT' | translate }}
              </p>
            </div>

            <div class="space-y-8">
              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.TERMS.S1_TITLE' | translate }}</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <dl class="space-y-4">
                    <div>
                      <dt class="font-semibold text-gray-900 dark:text-gray-100">{{ 'LANDING.TERMS.S1_SERVICE_TERM' | translate }}</dt>
                      <dd class="text-gray-700 dark:text-gray-300">{{ 'LANDING.TERMS.S1_SERVICE_DEF' | translate }}</dd>
                    </div>
                    <div>
                      <dt class="font-semibold text-gray-900 dark:text-gray-100">{{ 'LANDING.TERMS.S1_USER_TERM' | translate }}</dt>
                      <dd class="text-gray-700 dark:text-gray-300">{{ 'LANDING.TERMS.S1_USER_DEF' | translate }}</dd>
                    </div>
                    <div>
                      <dt class="font-semibold text-gray-900 dark:text-gray-100">{{ 'LANDING.TERMS.S1_CONTENT_TERM' | translate }}</dt>
                      <dd class="text-gray-700 dark:text-gray-300">{{ 'LANDING.TERMS.S1_CONTENT_DEF' | translate }}</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.TERMS.S2_TITLE' | translate }}</h2>
                <div class="space-y-4">
                  <div class="bg-[#155347]/10 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.TERMS.S2_PERMITTED_TITLE' | translate }}</h3>
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>{{ 'LANDING.TERMS.S2_PERMITTED_1' | translate }}</li>
                      <li>{{ 'LANDING.TERMS.S2_PERMITTED_2' | translate }}</li>
                      <li>{{ 'LANDING.TERMS.S2_PERMITTED_3' | translate }}</li>
                      <li>{{ 'LANDING.TERMS.S2_PERMITTED_4' | translate }}</li>
                    </ul>
                  </div>

                  <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.TERMS.S2_PROHIBITED_TITLE' | translate }}</h3>
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>{{ 'LANDING.TERMS.S2_PROHIBITED_1' | translate }}</li>
                      <li>{{ 'LANDING.TERMS.S2_PROHIBITED_2' | translate }}</li>
                      <li>{{ 'LANDING.TERMS.S2_PROHIBITED_3' | translate }}</li>
                      <li>{{ 'LANDING.TERMS.S2_PROHIBITED_4' | translate }}</li>
                      <li>{{ 'LANDING.TERMS.S2_PROHIBITED_5' | translate }}</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.TERMS.S3_TITLE' | translate }}</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.TERMS.S3_RESPONSIBILITIES_TITLE' | translate }}</h3>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                    <li>{{ 'LANDING.TERMS.S3_RESP_1' | translate }}</li>
                    <li>{{ 'LANDING.TERMS.S3_RESP_2' | translate }}</li>
                    <li>{{ 'LANDING.TERMS.S3_RESP_3' | translate }}</li>
                    <li>{{ 'LANDING.TERMS.S3_RESP_4' | translate }}</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.TERMS.S4_TITLE' | translate }}</h2>
                <div class="grid md:grid-cols-2 gap-6">
                  <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.TERMS.S4_YOUR_CONTENT_TITLE' | translate }}</h3>
                    <p class="text-gray-700 dark:text-gray-300 mb-3">
                      {{ 'LANDING.TERMS.S4_YOUR_CONTENT_1' | translate }}
                    </p>
                    <p class="text-gray-700 dark:text-gray-300">
                      {{ 'LANDING.TERMS.S4_YOUR_CONTENT_2' | translate }}
                    </p>
                  </div>

                  <div class="bg-[#155347]/10 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.TERMS.S4_OUR_PROPERTY_TITLE' | translate }}</h3>
                    <p class="text-gray-700 dark:text-gray-300 mb-3">
                      {{ 'LANDING.TERMS.S4_OUR_PROPERTY_1' | translate }}
                    </p>
                    <p class="text-gray-700 dark:text-gray-300">
                      {{ 'LANDING.TERMS.S4_OUR_PROPERTY_2' | translate }}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.TERMS.S5_TITLE' | translate }}</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.TERMS.S5_SUBSCRIPTIONS_TITLE' | translate }}</h3>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                    <li>{{ 'LANDING.TERMS.S5_SUB_1' | translate }}</li>
                    <li>{{ 'LANDING.TERMS.S5_SUB_2' | translate }}</li>
                    <li>{{ 'LANDING.TERMS.S5_SUB_3' | translate }}</li>
                    <li>{{ 'LANDING.TERMS.S5_SUB_4' | translate }}</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.TERMS.S6_TITLE' | translate }}</h2>
                <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    {{ 'LANDING.TERMS.S6_TEXT_1' | translate }}
                  </p>
                  <p class="text-gray-700 dark:text-gray-300">
                    {{ 'LANDING.TERMS.S6_TEXT_2' | translate }}
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.TERMS.S7_TITLE' | translate }}</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.TERMS.S7_BY_YOU_TITLE' | translate }}</h3>
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    {{ 'LANDING.TERMS.S7_BY_YOU_TEXT' | translate }}
                  </p>

                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'LANDING.TERMS.S7_BY_US_TITLE' | translate }}</h3>
                  <p class="text-gray-700 dark:text-gray-300">
                    {{ 'LANDING.TERMS.S7_BY_US_TEXT' | translate }}
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.TERMS.S8_TITLE' | translate }}</h2>
                <div class="bg-[#155347]/10 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    {{ 'LANDING.TERMS.S8_TEXT_1' | translate }}
                  </p>
                  <p class="text-gray-700 dark:text-gray-300">
                    {{ 'LANDING.TERMS.S8_TEXT_2' | translate }}
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.TERMS.S9_TITLE' | translate }}</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300">
                    {{ 'LANDING.TERMS.S9_TEXT' | translate }}
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'LANDING.TERMS.S10_TITLE' | translate }}</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300">
                    {{ 'LANDING.TERMS.S10_TEXT' | translate }}
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
export class TermsPageComponent {}
