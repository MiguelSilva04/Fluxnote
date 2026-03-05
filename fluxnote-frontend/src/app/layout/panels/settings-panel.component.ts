import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { PanelStateService, LanguageService, ThemeService } from '../../core/services';
import { ButtonComponent, WorkInProgressComponent } from '../../shared/components/ui';
import { AppLanguage } from '../../core/services/language.service';
import { AppTheme } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, TranslateModule, ButtonComponent, WorkInProgressComponent],
  template: `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
           [class.opacity-0]="!panelState.isSettingsPanelOpen()"
           [class.pointer-events-none]="!panelState.isSettingsPanelOpen()"
           (click)="panelState.closeSettingsPanel()"></div>

      <!-- Side Panel -->
      <aside class="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out"
             [class.translate-x-full]="!panelState.isSettingsPanelOpen()"
             [attr.inert]="!panelState.isSettingsPanelOpen() ? '' : null">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'SETTINGS.TITLE' | translate }}</h2>
          <button (click)="panelState.closeSettingsPanel()" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-8">
          <!-- Language Settings -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <lucide-icon name="globe" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
              <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">{{ 'SETTINGS.LANGUAGE.TITLE' | translate }}</h3>
            </div>
            <div class="relative">
              <div
                (click)="toggleLanguageDropdown()"
                class="w-full h-10 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <span class="text-gray-900 dark:text-gray-100">{{ languageService.getLabel(languageService.currentLang) }}</span>
                <lucide-icon name="chevron-down" class="h-4 w-4 text-gray-500"></lucide-icon>
              </div>
              @if (showLanguageDropdown()) {
                <div class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
                  @for (lang of availableLanguages; track lang.code) {
                    <button
                      (click)="selectLanguage(lang.code)"
                      [class]="'w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ' + (languageService.currentLang === lang.code ? 'bg-[#155347]/5 dark:bg-emerald-900/30 text-[#155347] dark:text-emerald-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600')"
                    >
                      <span>{{ lang.label }}</span>
                      @if (languageService.currentLang === lang.code) {
                        <lucide-icon name="check" class="h-4 w-4 text-[#155347] dark:text-emerald-400"></lucide-icon>
                      }
                    </button>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Theme Settings -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <lucide-icon name="palette" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
              <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">{{ 'SETTINGS.THEME.TITLE' | translate }}</h3>
            </div>
            <div class="space-y-2">
              @for (option of themeOptions; track option.value) {
                <div
                  (click)="selectTheme(option.value)"
                  [class]="'flex items-center gap-3 p-3 border rounded-lg transition-colors cursor-pointer ' + (option.value === themeService.currentTheme ? 'border-[#155347] dark:border-emerald-500 bg-[#155347]/5 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700')"
                >
                  <div [class]="'w-4 h-4 rounded-full border-2 flex items-center justify-center ' + (option.value === themeService.currentTheme ? 'border-[#155347] dark:border-emerald-400' : 'border-gray-300 dark:border-gray-500')">
                    @if (option.value === themeService.currentTheme) {
                      <div class="w-2 h-2 rounded-full bg-[#155347] dark:bg-emerald-400"></div>
                    }
                  </div>
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ option.labelKey | translate }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Notification Preferences -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <lucide-icon name="bell" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
              <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">{{ 'SETTINGS.NOTIFICATIONS.TITLE' | translate }}</h3>
            </div>
            <div class="space-y-3">
              @for (notif of notificationOptions; track notif.key) {
                <div class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ notif.labelKey | translate }}</span>
                  <button
                    (click)="showWipModal.set(true)"
                    [class]="'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ' + (notifications[notif.key] ? 'bg-[#155347]' : 'bg-gray-200 dark:bg-gray-600')"
                  >
                    <span
                      [class]="'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (notifications[notif.key] ? 'translate-x-6' : 'translate-x-1')"
                    ></span>
                  </button>
                </div>
              }
            </div>
          </div>
          
          <div class="space-y-2">
            <a
              routerLink="/settings"
              (click)="panelState.closeSettingsPanel()"
              class="w-full flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
            >
              <lucide-icon name="settings" class="h-5 w-5 text-gray-500"></lucide-icon>
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ 'SETTINGS.TITLE' | translate }}</span>
            </a>
          </div>
        </div>

        <div class="p-6 border-t border-gray-200 dark:border-gray-700">
          <app-button (onClick)="showWipModal.set(true)" customClass="w-full bg-[#155347] hover:bg-[#0d3d31]">
            {{ 'COMMON.SAVE_CHANGES' | translate }}
          </app-button>
        </div>
      </aside>

      <app-work-in-progress [show]="showWipModal()" (close)="showWipModal.set(false)" />
  `
})
export class SettingsPanelComponent {
  panelState = inject(PanelStateService);
  languageService = inject(LanguageService);
  themeService = inject(ThemeService);
  showWipModal = signal(false);
  showLanguageDropdown = signal(false);

  notifications: Record<string, boolean> = { email: true, push: true, desktop: false };

  availableLanguages: { code: AppLanguage; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'pt', label: 'Português' }
  ];

  themeOptions = [
    { value: 'light', labelKey: 'SETTINGS.THEME.LIGHT' },
    { value: 'dark', labelKey: 'SETTINGS.THEME.DARK' },
    { value: 'auto', labelKey: 'SETTINGS.THEME.AUTO' }
  ];

  notificationOptions = [
    { key: 'email', labelKey: 'SETTINGS.NOTIFICATIONS.EMAIL' },
    { key: 'push', labelKey: 'SETTINGS.NOTIFICATIONS.PUSH' },
    { key: 'desktop', labelKey: 'SETTINGS.NOTIFICATIONS.DESKTOP' }
  ];

  toggleLanguageDropdown(): void {
    this.showLanguageDropdown.update(v => !v);
  }

  selectLanguage(lang: AppLanguage): void {
    this.languageService.setLanguage(lang);
    this.showLanguageDropdown.set(false);
  }

  selectTheme(theme: string): void {
    this.themeService.setTheme(theme as AppTheme);
  }
}
