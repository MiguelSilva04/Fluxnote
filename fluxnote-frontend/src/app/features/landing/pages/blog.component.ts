import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, TranslateModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="py-20 bg-gradient-to-br from-[#155347]/10 to-white dark:to-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <span class="inline-block bg-[#155347] text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-6">{{ 'LANDING.BLOG.COMING_SOON_BADGE' | translate }}</span>
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              {{ 'LANDING.BLOG.TITLE' | translate }}
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {{ 'LANDING.BLOG.DESCRIPTION' | translate }}
            </p>
          </div>

          <div class="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
            <div class="w-20 h-20 bg-[#155347]/10 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-[#155347] dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {{ 'LANDING.BLOG.CARD_TITLE' | translate }}
            </h2>
            <p class="text-gray-600 dark:text-gray-400">
              {{ 'LANDING.BLOG.CARD_DESC' | translate }}
            </p>
          </div>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class BlogPageComponent {}
