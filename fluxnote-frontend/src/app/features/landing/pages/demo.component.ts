import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';
import { WorkInProgressComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule, LandingHeaderComponent, LandingFooterComponent, WorkInProgressComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="bg-gradient-to-br from-[#155347]/10 to-white dark:to-gray-900 py-20 lg:py-32">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              {{ 'LANDING.DEMO.HERO_TITLE' | translate }}
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              {{ 'LANDING.DEMO.HERO_SUBTITLE' | translate }}
            </p>
          </div>

          <div class="max-w-4xl mx-auto mb-12">
            <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              <div class="relative">
                <img
                  src="assets/videoBackground.jpg"
                  alt="Fluxnote demo"
                  class="w-full h-96 lg:h-[500px] object-cover"
                />
                <div class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <button (click)="showWipModal.set(true)" class="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-6 transition-all transform hover:scale-105 shadow-lg cursor-pointer">
                    <svg class="w-12 h-12 text-[#155347] dark:text-emerald-400 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="text-center">
            <button (click)="goToRegister()" class="bg-[#155347] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-[#155347] transition-colors shadow-lg cursor-pointer">
              {{ 'LANDING.DEMO.CTA_CREATE' | translate }}
            </button>
          </div>
        </div>
      </section>

      <!-- Interactive Steps Section -->
      <section class="py-20 bg-gray-50 dark:bg-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {{ 'LANDING.DEMO.STEPS_TITLE' | translate }}
            </h2>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              {{ 'LANDING.DEMO.STEPS_SUBTITLE' | translate }}
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            @for (step of steps; track step.titleKey; let i = $index) {
              <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center relative">
                <div class="inline-flex items-center justify-center w-20 h-20 bg-[#155347]/15 rounded-full text-[#155347] dark:text-emerald-400 mb-6">
                  <lucide-icon [name]="step.icon" class="w-10 h-10"></lucide-icon>
                </div>
                <div class="absolute top-4 left-4 bg-[#155347] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  {{ i + 1 }}
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {{ step.titleKey | translate }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400">
                  {{ step.descKey | translate }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Final Call to Action -->
      <section class="py-20 bg-gray-900 text-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl lg:text-4xl font-bold mb-6">
            {{ 'LANDING.DEMO.FINAL_TITLE' | translate }}
          </h2>
          <p class="text-xl text-gray-300 mb-8">
            {{ 'LANDING.DEMO.FINAL_SUBTITLE' | translate }}
          </p>
          <button (click)="goToRegister()" class="bg-[#155347] text-white px-12 py-4 rounded-xl text-xl font-semibold hover:bg-[#155347] transition-colors shadow-lg cursor-pointer">
            {{ 'LANDING.DEMO.FINAL_CTA' | translate }}
          </button>
          <p class="text-gray-400 mt-4">
            {{ 'LANDING.DEMO.FINAL_NOTE' | translate }}
          </p>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>

      <app-work-in-progress [show]="showWipModal()" (close)="showWipModal.set(false)" />
    </div>
  `
})
export class DemoPageComponent {
  showWipModal = signal(false);

  steps = [
    { icon: 'file-plus', titleKey: 'LANDING.DEMO.STEP_1_TITLE', descKey: 'LANDING.DEMO.STEP_1_DESC' },
    { icon: 'users', titleKey: 'LANDING.DEMO.STEP_2_TITLE', descKey: 'LANDING.DEMO.STEP_2_DESC' },
    { icon: 'sparkles', titleKey: 'LANDING.DEMO.STEP_3_TITLE', descKey: 'LANDING.DEMO.STEP_3_DESC' },
    { icon: 'history', titleKey: 'LANDING.DEMO.STEP_4_TITLE', descKey: 'LANDING.DEMO.STEP_4_DESC' }
  ];

  constructor(private router: Router) {}

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
