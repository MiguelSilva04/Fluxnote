import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-landing-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <footer class="bg-gray-900 text-white py-16 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-4 gap-8">
          <div>
            <h3 class="text-lg font-semibold mb-4">{{ 'LANDING.FOOTER.INFO' | translate }}</h3>
            <ul class="space-y-3">
              <li>
                <button
                  (click)="scrollTo('funcionalidades')"
                  class="text-gray-300 hover:text-white transition-colors text-left cursor-pointer"
                >
                  {{ 'LANDING.HEADER.FEATURES' | translate }}
                </button>
              </li>
              <li>
                <button
                  (click)="scrollTo('faq')"
                  class="text-gray-300 hover:text-white transition-colors text-left cursor-pointer"
                >
                  {{ 'LANDING.HEADER.FAQ' | translate }}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-4">{{ 'LANDING.FOOTER.RESOURCES' | translate }}</h3>
            <ul class="space-y-3">
              <li>
                <button
                  (click)="navigateTo('/technologies')"
                  class="text-gray-300 hover:text-white transition-colors text-left cursor-pointer"
                >
                  {{ 'LANDING.FOOTER.TECHNOLOGIES' | translate }}
                </button>
              </li>
              <li>
                <button
                  (click)="navigateTo('/blog')"
                  class="text-gray-300 hover:text-white transition-colors text-left cursor-pointer"
                >
                  {{ 'LANDING.FOOTER.BLOG' | translate }}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-4">{{ 'LANDING.FOOTER.ABOUT_FLUXNOTE' | translate }}</h3>
            <ul class="space-y-3">
              <li>
                <button
                  (click)="navigateTo('/privacy')"
                  class="text-gray-300 hover:text-white transition-colors text-left cursor-pointer"
                >
                  {{ 'LANDING.FOOTER.PRIVACY_POLICY' | translate }}
                </button>
              </li>
              <li>
                <button
                  (click)="navigateTo('/terms')"
                  class="text-gray-300 hover:text-white transition-colors text-left cursor-pointer"
                >
                  {{ 'LANDING.FOOTER.TERMS' | translate }}
                </button>
              </li>
              <li>
                <button
                  (click)="navigateTo('/contact')"
                  class="text-gray-300 hover:text-white transition-colors text-left cursor-pointer"
                >
                  {{ 'LANDING.FOOTER.CONTACT' | translate }}
                </button>
              </li>
              <li>
                <button
                  (click)="navigateTo('/about')"
                  class="text-gray-300 hover:text-white transition-colors text-left cursor-pointer"
                >
                  {{ 'LANDING.FOOTER.ABOUT_US' | translate }}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="text-lg font-semibold mb-4">{{ 'LANDING.FOOTER.NEWSLETTER' | translate }}</h3>
            <div class="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
              <div class="flex items-center gap-2 mb-2">
                <span class="bg-[#155347] text-white text-xs font-semibold px-2 py-0.5 rounded-full">{{ 'LANDING.FOOTER.COMING_SOON' | translate }}</span>
              </div>
              <p class="text-gray-400 text-sm">
                {{ 'LANDING.FOOTER.NEWSLETTER_DESC' | translate }}
              </p>
            </div>
            <div>
              <p class="text-gray-400 text-sm mb-3">{{ 'LANDING.FOOTER.SOCIAL_COMING' | translate }}</p>
              <div class="flex items-center gap-2">
                <span class="bg-gray-800 border border-gray-700 text-gray-500 text-xs px-3 py-1.5 rounded-lg">Instagram</span>
                <span class="bg-gray-800 border border-gray-700 text-gray-500 text-xs px-3 py-1.5 rounded-lg">LinkedIn</span>
                <span class="bg-gray-800 border border-gray-700 text-gray-500 text-xs px-3 py-1.5 rounded-lg">X</span>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div class="flex items-center mb-4 md:mb-0">
            <img
              src="assets/icon.png"
              alt="Fluxnote Icon"
              class="w-6 h-6 mr-2 rounded"
            />
            <div class="text-2xl font-bold text-[#155347]">Fluxnote</div>
          </div>
          <div class="text-gray-400 text-sm">
            {{ 'LANDING.FOOTER.ALL_RIGHTS' | translate }}
          </div>
        </div>
      </div>
    </footer>
  `
})
export class LandingFooterComponent {
  constructor(private router: Router) {}

  scrollTo(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
