import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { LanguageService } from '../../../core/services/language.service';
import { AppLanguage } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-landing-header',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  template: `
    <header class="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <button
              (click)="scrollToTop()"
              class="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img
                src="assets/icon.png"
                alt="Fluxnote Icon"
                class="w-8 h-8 mr-2 rounded"
              />
              <div class="text-2xl font-bold text-[#155347] dark:text-emerald-400">Fluxnote</div>
            </button>
          </div>
          <nav class="hidden md:flex space-x-8">
            <button
              (click)="scrollTo('funcionalidades')"
              class="text-gray-700 dark:text-gray-300 hover:text-[#155347] dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {{ 'LANDING.HEADER.FEATURES' | translate }}
            </button>
            <button
              (click)="scrollTo('faq')"
              class="text-gray-700 dark:text-gray-300 hover:text-[#155347] dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {{ 'LANDING.HEADER.FAQ' | translate }}
            </button>
          </nav>
          <div class="hidden md:flex items-center space-x-4">
            <!-- Theme Toggle -->
            <button
              (click)="themeService.setTheme(themeService.isDark ? 'light' : 'dark')"
              class="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-[#155347] dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              [title]="themeService.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              @if (themeService.isDark) {
                <lucide-icon name="sun" class="h-5 w-5"></lucide-icon>
              } @else {
                <lucide-icon name="moon" class="h-5 w-5"></lucide-icon>
              }
            </button>
            <!-- Language Switcher -->
            <div class="relative">
              <button
                (click)="toggleLangDropdown()"
                class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-[#155347] dark:hover:text-emerald-400 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span class="text-sm font-medium uppercase">{{ languageService.currentLang }}</span>
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              @if (showLangDropdown()) {
                <div class="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[140px]">
                  @for (lang of availableLanguages; track lang.code) {
                    <button
                      (click)="selectLanguage(lang.code)"
                      [class]="'w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between ' + (languageService.currentLang === lang.code ? 'bg-[#155347]/5 dark:bg-emerald-900/30 text-[#155347] dark:text-emerald-400 font-medium' : 'text-gray-700 dark:text-gray-300')"
                    >
                      <span>{{ lang.label }}</span>
                      @if (languageService.currentLang === lang.code) {
                        <svg class="h-4 w-4 text-[#155347] dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                      }
                    </button>
                  }
                </div>
              }
            </div>
            <button
              (click)="goToLogin()"
              class="text-gray-700 dark:text-gray-300 hover:text-[#155347] dark:hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {{ 'LANDING.HEADER.SIGN_IN' | translate }}
            </button>
            <button
              (click)="goToRegister()"
              class="bg-[#155347] text-white px-4 py-2 rounded-lg hover:bg-[#155347] transition-colors cursor-pointer"
            >
              {{ 'LANDING.HEADER.CREATE_ACCOUNT' | translate }}
            </button>
          </div>
          <div class="md:hidden flex items-center gap-2">
            <!-- Mobile Theme Toggle -->
            <button
              (click)="themeService.setTheme(themeService.isDark ? 'light' : 'dark')"
              class="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-[#155347] dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              @if (themeService.isDark) {
                <lucide-icon name="sun" class="h-5 w-5"></lucide-icon>
              } @else {
                <lucide-icon name="moon" class="h-5 w-5"></lucide-icon>
              }
            </button>
            <!-- Mobile Language Switcher -->
            <button
              (click)="toggleLanguageMobile()"
              class="text-gray-600 dark:text-gray-400 hover:text-[#155347] dark:hover:text-emerald-400 cursor-pointer px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium uppercase"
            >
              {{ languageService.currentLang }}
            </button>
            <button
              (click)="toggleMenu()"
              class="text-gray-700 dark:text-gray-300 hover:text-[#155347] dark:hover:text-emerald-400 cursor-pointer"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        @if (isMenuOpen()) {
          <div class="md:hidden py-4 border-t border-gray-100 dark:border-gray-800">
            <div class="flex flex-col space-y-4">
              <button
                (click)="scrollTo('funcionalidades'); closeMenu()"
                class="text-gray-700 dark:text-gray-300 hover:text-[#155347] dark:hover:text-emerald-400 transition-colors text-left cursor-pointer"
              >
                {{ 'LANDING.HEADER.FEATURES' | translate }}
              </button>
              <button
                (click)="scrollTo('faq'); closeMenu()"
                  class="text-gray-700 dark:text-gray-300 hover:text-[#155347] dark:hover:text-emerald-400 transition-colors text-left cursor-pointer"
              >
                {{ 'LANDING.HEADER.FAQ' | translate }}
              </button>
              <div class="flex flex-col space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  (click)="goToLogin(); closeMenu()"
                  class="text-gray-700 dark:text-gray-300 hover:text-[#155347] dark:hover:text-emerald-400 transition-colors text-left cursor-pointer"
                >
                  {{ 'LANDING.HEADER.SIGN_IN' | translate }}
                </button>
                <button
                  (click)="goToRegister(); closeMenu()"
                  class="bg-[#155347] text-white px-4 py-2 rounded-lg hover:bg-[#155347] transition-colors cursor-pointer"
                >
                  {{ 'LANDING.HEADER.CREATE_ACCOUNT' | translate }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </header>
  `
})
export class LandingHeaderComponent {
  languageService = inject(LanguageService);
  themeService = inject(ThemeService);
  isMenuOpen = signal(false);
  showLangDropdown = signal(false);

  availableLanguages: { code: AppLanguage; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'pt', label: 'Português' }
  ];

  constructor(private router: Router) {}

  toggleMenu(): void {
    this.isMenuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  toggleLangDropdown(): void {
    this.showLangDropdown.update(v => !v);
  }

  selectLanguage(lang: AppLanguage): void {
    this.languageService.setLanguage(lang);
    this.showLangDropdown.set(false);
  }

  toggleLanguageMobile(): void {
    const next: AppLanguage = this.languageService.currentLang === 'en' ? 'pt' : 'en';
    this.languageService.setLanguage(next);
  }

  scrollTo(sectionId: string): void {
    if (this.router.url === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      this.router.navigate(['/'], { fragment: sectionId });
    }
  }

  scrollToTop(): void {
    if (this.router.url === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.router.navigate(['/']);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
