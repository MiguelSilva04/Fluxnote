import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-technologies',
  standalone: true,
  imports: [CommonModule, TranslateModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="py-20 bg-gradient-to-br from-[#155347]/10 to-white dark:to-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              {{ 'TECHNOLOGIES.TITLE' | translate }}
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {{ 'TECHNOLOGIES.SUBTITLE' | translate }}
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (category of techCategories; track category.titleKey) {
              <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div class="flex items-center mb-6">
                  <span class="text-4xl mr-4">{{ category.icon }}</span>
                  <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ category.titleKey | translate }}
                  </h2>
                </div>

                <div class="space-y-4">
                  @for (tech of category.technologies; track tech.name) {
                    <div class="border-l-4 border-[#155347] pl-4">
                      <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {{ tech.name }}
                      </h3>
                      <p class="text-gray-600 dark:text-gray-400 text-sm">
                        {{ tech.descKey | translate }}
                      </p>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <div class="mt-16 bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
              {{ 'TECHNOLOGIES.ARCH_TITLE' | translate }}
            </h2>
            <div class="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div class="bg-[#155347]/15 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">🌐</span>
                </div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {{ 'TECHNOLOGIES.ARCH_FRONTEND_TITLE' | translate }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 text-sm">
                  {{ 'TECHNOLOGIES.ARCH_FRONTEND_DESC' | translate }}
                </p>
              </div>
              <div>
                <div class="bg-[#155347]/15 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">⚡</span>
                </div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {{ 'TECHNOLOGIES.ARCH_BACKEND_TITLE' | translate }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 text-sm">
                  {{ 'TECHNOLOGIES.ARCH_BACKEND_DESC' | translate }}
                </p>
              </div>
              <div>
                <div class="bg-[#155347]/15 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">🔄</span>
                </div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {{ 'TECHNOLOGIES.ARCH_REALTIME_TITLE' | translate }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 text-sm">
                  {{ 'TECHNOLOGIES.ARCH_REALTIME_DESC' | translate }}
                </p>
              </div>
            </div>
            <div class="text-center mt-8">
              <button
                (click)="goBack()"
                class="bg-[#155347] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:opacity-90 transition-opacity shadow-lg cursor-pointer"
              >
                {{ 'TECHNOLOGIES.BACK' | translate }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class TechnologiesPageComponent {
  techCategories = [
    {
      titleKey: 'TECHNOLOGIES.FRONTEND_TITLE',
      icon: '🎨',
      technologies: [
        { name: 'Angular 19',             descKey: 'TECHNOLOGIES.FRONTEND_T1_DESC' },
        { name: 'TailwindCSS',            descKey: 'TECHNOLOGIES.FRONTEND_T2_DESC' },
        { name: 'Lucide Icons',           descKey: 'TECHNOLOGIES.FRONTEND_T3_DESC' },
        { name: 'ngx-translate',          descKey: 'TECHNOLOGIES.FRONTEND_T4_DESC' }
      ]
    },
    {
      titleKey: 'TECHNOLOGIES.BACKEND_TITLE',
      icon: '⚙️',
      technologies: [
        { name: 'ASP.NET Core 8.0',       descKey: 'TECHNOLOGIES.BACKEND_T1_DESC' },
        { name: 'Entity Framework Core',  descKey: 'TECHNOLOGIES.BACKEND_T2_DESC' },
        { name: 'SignalR',                descKey: 'TECHNOLOGIES.BACKEND_T3_DESC' }
      ]
    },
    {
      titleKey: 'TECHNOLOGIES.AUTH_TITLE',
      icon: '🔒',
      technologies: [
        { name: 'JWT Bearer',             descKey: 'TECHNOLOGIES.AUTH_T1_DESC' },
        { name: 'Refresh Tokens',         descKey: 'TECHNOLOGIES.AUTH_T2_DESC' },
        { name: 'OAuth 2.0',              descKey: 'TECHNOLOGIES.AUTH_T3_DESC' }
      ]
    },
    {
      titleKey: 'TECHNOLOGIES.DATABASE_TITLE',
      icon: '🗄️',
      technologies: [
        { name: 'SQL Server',             descKey: 'TECHNOLOGIES.DATABASE_T1_DESC' },
        { name: 'EF Core Migrations',     descKey: 'TECHNOLOGIES.DATABASE_T2_DESC' }
      ]
    },
    {
      titleKey: 'TECHNOLOGIES.AI_TITLE',
      icon: '🤖',
      technologies: [
        { name: 'OpenAI API',             descKey: 'TECHNOLOGIES.AI_T1_DESC' }
      ]
    },
    {
      titleKey: 'TECHNOLOGIES.INFRA_TITLE',
      icon: '☁️',
      technologies: [
        { name: 'Docker',                 descKey: 'TECHNOLOGIES.INFRA_T1_DESC' },
        { name: 'Ubuntu 22 LTS',          descKey: 'TECHNOLOGIES.INFRA_T2_DESC' },
        { name: 'GitHub Actions',         descKey: 'TECHNOLOGIES.INFRA_T3_DESC' }
      ]
    }
  ];

  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/']);
  }
}
