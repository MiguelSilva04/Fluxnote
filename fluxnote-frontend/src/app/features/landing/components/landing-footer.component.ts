import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-landing-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
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
                  (click)="scrollTo('testemunhos')"
                  class="text-gray-300 hover:text-white transition-colors text-left cursor-pointer"
                >
                  {{ 'LANDING.HEADER.TESTIMONIALS' | translate }}
                </button>
              </li>
              <li>
                <button
                  (click)="scrollTo('precos')"
                  class="text-gray-300 hover:text-white transition-colors text-left cursor-pointer"
                >
                  {{ 'LANDING.HEADER.PRICING' | translate }}
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
            <p class="text-gray-300 mb-4">
              {{ 'LANDING.FOOTER.NEWSLETTER_DESC' | translate }}
            </p>

            <form (submit)="handleNewsletterSubmit($event)" class="mb-6">
              <div class="flex">
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  [placeholder]="'LANDING.FOOTER.YOUR_EMAIL' | translate"
                  class="flex-1 px-4 py-2 rounded-l-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-[#155347]"
                  required
                />
                <button
                  type="submit"
                  class="bg-[#155347] text-white px-6 py-2 rounded-r-lg hover:bg-[#155347] transition-colors cursor-pointer"
                >
                  {{ 'LANDING.FOOTER.SUBSCRIBE' | translate }}
                </button>
              </div>
            </form>

            <div class="flex space-x-4">
              <a href="#" class="text-gray-300 hover:text-white transition-colors cursor-pointer">
                <svg class="w-6 h-6" viewBox="0 0 448 512" fill="currentColor">
                  <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9S160.5 370.8 224.1 370.8 339 319.5 339 255.9 287.7 141 224.1 141zm0 186c-39.3 0-71.1-31.8-71.1-71.1s31.8-71.1 71.1-71.1 71.1 31.8 71.1 71.1-31.9 71.1-71.1 71.1zm146.4-194.3c0 14.9-12 26.9-26.9 26.9s-26.9-12-26.9-26.9 12-26.9 26.9-26.9 26.9 12 26.9 26.9zm76.1 27.2c-1.7-35.7-9.9-67.3-36.2-93.5s-57.8-34.5-93.5-36.2C293.7 0 154.3 0 107.1 1.5 71.4 3.2 39.8 11.4 13.6 37.7S-21 95.6-22.7 131.3C-24.2 178.5-24.2 317.9-22.7 365.1c1.7 35.7 9.9 67.3 36.2 93.5s57.8 34.5 93.5 36.2c47.2 1.5 186.6 1.5 233.8 0 35.7-1.7 67.3-9.9 93.5-36.2s34.5-57.8 36.2-93.5c1.5-47.2 1.5-186.6 0-233.8zM398.8 388c-7.8 19.6-22.9 34.7-42.5 42.5-29.4 11.7-99.2 9-132.2 9s-102.8 2.6-132.2-9c-19.6-7.8-34.7-22.9-42.5-42.5-11.7-29.4-9-99.2-9-132.2s-2.6-102.8 9-132.2c7.8-19.6 22.9-34.7 42.5-42.5 29.4-11.7 99.2-9 132.2-9s102.8-2.6 132.2 9c19.6 7.8 34.7 22.9 42.5 42.5 11.7 29.4 9 99.2 9 132.2s2.6 102.8-9 132.2z" />
                </svg>
              </a>
              <a href="#" class="text-gray-300 hover:text-white transition-colors cursor-pointer">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.675 0h-3.938l-5.737 8.099L6.998 0H.49l7.954 11.338L.116 24h3.938l6.32-8.914L17.005 24h6.508l-8.41-11.99L22.675 0z" />
                </svg>
              </a>
              <a href="#" class="text-gray-300 hover:text-white transition-colors cursor-pointer">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a href="#" class="text-gray-300 hover:text-white transition-colors cursor-pointer">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.675 0h-21.35C.596 0 0 .596 0 1.325v21.351C0 23.404.596 24 1.325 24H12.82v-9.294H9.692V11.08h3.128V8.413c0-3.1 1.894-4.788 4.66-4.788 1.325 0 2.464.099 2.796.143v3.24l-1.92.001c-1.504 0-1.794.715-1.794 1.763v2.31h3.587l-.467 3.626h-3.12V24h6.116c.729 0 1.325-.596 1.325-1.324V1.325C24 .596 23.404 0 22.675 0z" />
                </svg>
              </a>
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
  email = '';

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

  handleNewsletterSubmit(event: Event): void {
    event.preventDefault();
    console.log('Newsletter subscription:', this.email);
    this.email = '';
  }
}
