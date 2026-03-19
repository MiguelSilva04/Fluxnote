import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TranslateModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <!-- Mission -->
      <section class="py-20 bg-gradient-to-br from-[#155347]/10 to-white dark:to-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              {{ 'ABOUT.TITLE' | translate }}
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {{ 'ABOUT.SUBTITLE' | translate }}
            </p>
          </div>

          <div class="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                {{ 'ABOUT.MISSION_TITLE' | translate }}
              </h2>
              <p class="text-gray-700 dark:text-gray-300 mb-6 text-lg">
                {{ 'ABOUT.MISSION_P1' | translate }}
              </p>
              <p class="text-gray-700 dark:text-gray-300 text-lg">
                {{ 'ABOUT.MISSION_P2' | translate }}
              </p>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
              <div class="grid grid-cols-2 gap-4">
                @for (stat of stats; track stat.labelKey) {
                  <div class="text-center p-4 bg-[#155347]/5 dark:bg-emerald-900/20 rounded-xl">
                    <div class="text-3xl font-bold text-[#155347] dark:text-emerald-400 mb-1">{{ stat.value }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">{{ stat.labelKey | translate }}</div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Values -->
      <section class="py-20 bg-white dark:bg-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {{ 'ABOUT.VALUES_TITLE' | translate }}
            </h2>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {{ 'ABOUT.VALUES_SUBTITLE' | translate }}
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            @for (value of values; track value.titleKey) {
              <div class="text-center">
                <div class="text-4xl mb-4">{{ value.icon }}</div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {{ value.titleKey | translate }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400">
                  {{ value.descKey | translate }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Team -->
      <section class="py-20 bg-gray-50 dark:bg-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {{ 'ABOUT.TEAM_TITLE' | translate }}
            </h2>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {{ 'ABOUT.TEAM_SUBTITLE' | translate }}
            </p>
          </div>

          <div class="flex flex-wrap justify-center gap-8">
            @for (member of teamMembers; track member.name) {
              <div class="bg-white dark:bg-gray-700 rounded-2xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow w-64">
                <div
                  class="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold"
                  [style.background-color]="member.color"
                >
                  {{ member.initials }}
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {{ member.name }}
                </h3>
                <p class="text-[#155347] dark:text-emerald-400 font-medium mb-3 text-sm">
                  {{ member.roleKey | translate }}
                </p>
                <p class="text-gray-600 dark:text-gray-400 text-sm">
                  {{ member.descKey | translate }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Journey -->
      <section class="py-20 bg-white dark:bg-gray-900">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {{ 'ABOUT.JOURNEY_TITLE' | translate }}
            </h2>
            <p class="text-xl text-gray-600 dark:text-gray-400">
              {{ 'ABOUT.JOURNEY_SUBTITLE' | translate }}
            </p>
          </div>

          <div class="relative">
            <div class="absolute left-8 top-0 bottom-0 w-0.5 bg-[#155347]/40"></div>

            <div class="space-y-12">
              @for (milestone of milestones; track milestone.dateKey) {
                <div class="relative flex items-start">
                  <div class="absolute left-6 w-4 h-4 bg-[#155347] rounded-full border-4 border-white dark:border-gray-900 shadow-lg"></div>
                  <div class="ml-16 bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                    <div class="flex items-center mb-3">
                      <span class="text-sm font-semibold text-[#155347] dark:text-emerald-400 bg-[#155347]/10 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                        {{ milestone.dateKey | translate }}
                      </span>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {{ milestone.titleKey | translate }}
                    </h3>
                    <p class="text-gray-700 dark:text-gray-300">
                      {{ milestone.descKey | translate }}
                    </p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="py-20 bg-[#155347] text-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl lg:text-4xl font-bold mb-6">
            {{ 'ABOUT.CTA_TITLE' | translate }}
          </h2>
          <p class="text-xl mb-8 opacity-90">
            {{ 'ABOUT.CTA_SUBTITLE' | translate }}
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              (click)="goToRegister()"
              class="bg-white text-[#155347] px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              {{ 'ABOUT.CTA_GET_STARTED' | translate }}
            </button>
            <button
              (click)="goToContact()"
              class="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white hover:text-[#155347] transition-colors cursor-pointer"
            >
              {{ 'ABOUT.CTA_CONTACT' | translate }}
            </button>
          </div>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class AboutPageComponent {
  stats = [
    { value: '3',    labelKey: 'ABOUT.STAT_MEMBERS' },
    { value: '4',    labelKey: 'ABOUT.STAT_FEATURES' },
    { value: '2',    labelKey: 'ABOUT.STAT_LANGS' },
    { value: '2026', labelKey: 'ABOUT.STAT_YEAR' }
  ];

  teamMembers = [
    {
      name: 'Miguel Silva',
      initials: 'MS',
      color: '#155347',
      roleKey: 'ABOUT.MIGUEL_ROLE',
      descKey: 'ABOUT.MIGUEL_DESC'
    },
    {
      name: 'Rúben Alves',
      initials: 'RA',
      color: '#0f766e',
      roleKey: 'ABOUT.RUBEN_ROLE',
      descKey: 'ABOUT.RUBEN_DESC'
    },
    {
      name: 'Ricardo Oliveira',
      initials: 'RO',
      color: '#047857',
      roleKey: 'ABOUT.RICARDO_ROLE',
      descKey: 'ABOUT.RICARDO_DESC'
    }
  ];

  values = [
    { icon: '🤝', titleKey: 'ABOUT.V1_TITLE', descKey: 'ABOUT.V1_DESC' },
    { icon: '🚀', titleKey: 'ABOUT.V2_TITLE', descKey: 'ABOUT.V2_DESC' },
    { icon: '🔒', titleKey: 'ABOUT.V3_TITLE', descKey: 'ABOUT.V3_DESC' },
    { icon: '🧠', titleKey: 'ABOUT.V4_TITLE', descKey: 'ABOUT.V4_DESC' }
  ];

  milestones = [
    { dateKey: 'ABOUT.M1_DATE', titleKey: 'ABOUT.M1_TITLE', descKey: 'ABOUT.M1_DESC' },
    { dateKey: 'ABOUT.M2_DATE', titleKey: 'ABOUT.M2_TITLE', descKey: 'ABOUT.M2_DESC' },
    { dateKey: 'ABOUT.M3_DATE', titleKey: 'ABOUT.M3_TITLE', descKey: 'ABOUT.M3_DESC' }
  ];

  constructor(private router: Router) {}

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goToContact(): void {
    this.router.navigate(['/contact']);
  }
}
