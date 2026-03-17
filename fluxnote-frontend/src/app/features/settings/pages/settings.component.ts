import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent } from '../../../shared/components/ui';
import { AuthService, LanguageService, NotificationService, ThemeService } from '../../../core/services';
import { AppLanguage } from '../../../core/services/language.service';
import { AppTheme } from '../../../core/services/theme.service';
import { NotificationPreferences } from '../../../core/models/notification.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslateModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="max-w-4xl">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">{{ 'SETTINGS.TITLE' | translate }}</h1>

        <div class="space-y-6">
          <!-- Language Settings -->
          <app-card>
            <app-card-content customClass="p-6">
              <div class="flex items-center gap-3 mb-4">
                <lucide-icon name="globe" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'SETTINGS.LANGUAGE.TITLE' | translate }}</h2>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ 'SETTINGS.LANGUAGE.DESC' | translate }}</p>
              <div class="relative w-full max-w-xs">
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
            </app-card-content>
          </app-card>

          <!-- Theme Settings -->
          <app-card>
            <app-card-content customClass="p-6">
              <div class="flex items-center gap-3 mb-4">
                <lucide-icon name="palette" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'SETTINGS.THEME.TITLE' | translate }}</h2>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ 'SETTINGS.THEME.DESC' | translate }}</p>
              <div class="space-y-3 max-w-xs">
                @for (option of themeOptions; track option.value) {
                  <div
                    (click)="selectTheme(option.value)"
                    [class]="'flex items-center gap-3 p-3 border-2 rounded-lg transition-colors cursor-pointer ' + (option.value === themeService.currentTheme ? 'border-[#155347] dark:border-emerald-500 bg-[#155347]/5 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700')"
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
            </app-card-content>
          </app-card>

          <!-- Notification Preferences -->
          <app-card>
            <app-card-content customClass="p-6">
              <div class="flex items-center gap-3 mb-4">
                <lucide-icon name="bell" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'SETTINGS.NOTIFICATIONS.TITLE' | translate }}</h2>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ 'SETTINGS.NOTIFICATIONS.DESC' | translate }}</p>
              <div class="space-y-3">
                <div class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div>
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ 'SETTINGS.NOTIFICATIONS.EMAIL' | translate }}</span>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ 'SETTINGS.NOTIFICATIONS.EMAIL_DESC' | translate }}</p>
                  </div>
                  <button
                    (click)="toggleEmailNotifications()"
                    [class]="'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ' + (notifPreferences().emailEnabled ? 'bg-[#155347]' : 'bg-gray-200 dark:bg-gray-600')"
                  >
                    <span
                      [class]="'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (notifPreferences().emailEnabled ? 'translate-x-6' : 'translate-x-1')"
                    ></span>
                  </button>
                </div>
                <div class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div>
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ 'SETTINGS.NOTIFICATIONS.IN_APP' | translate }}</span>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ 'SETTINGS.NOTIFICATIONS.IN_APP_DESC' | translate }}</p>
                  </div>
                  <button
                    (click)="toggleInAppNotifications()"
                    [class]="'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ' + (notifPreferences().inAppEnabled ? 'bg-[#155347]' : 'bg-gray-200 dark:bg-gray-600')"
                  >
                    <span
                      [class]="'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (notifPreferences().inAppEnabled ? 'translate-x-6' : 'translate-x-1')"
                    ></span>
                  </button>
                </div>
              </div>
            </app-card-content>
          </app-card>

          <app-card>
              <app-card-content customClass="p-6">
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'SETTINGS.SESSION.TITLE' | translate }}</h3>
                <div class="space-y-3">
                  <button
                    (click)="showLogoutModal.set(true)"
                    class="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left group"
                  >
                    <lucide-icon name="log-out" class="h-5 w-5 text-gray-500 group-hover:text-red-500"></lucide-icon>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-red-600">{{ 'SETTINGS.SESSION.LOGOUT' | translate }}</p>
                      <p class="text-xs text-gray-500">{{ 'SETTINGS.SESSION.LOGOUT_DESC' | translate }}</p>
                    </div>
                  </button>
                  <button
                    (click)="showLogoutAllModal.set(true)"
                    class="w-full flex items-center gap-3 p-4 border border-red-200 dark:border-red-900/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left group"
                  >
                    <lucide-icon name="log-out" class="h-5 w-5 text-red-500"></lucide-icon>
                    <div>
                      <p class="text-sm font-medium text-red-600">{{ 'SETTINGS.SESSION.LOGOUT_ALL' | translate }}</p>
                      <p class="text-xs text-gray-500">{{ 'SETTINGS.SESSION.LOGOUT_ALL_DESC' | translate }}</p>
                    </div>
                  </button>
                </div>
              </app-card-content>
            </app-card>

        </div>
      </div>

      <!-- Logout Confirmation Modal -->
      @if (showLogoutModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showLogoutModal.set(false)">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6" (click)="$event.stopPropagation()">
            <div class="text-center mb-4">
              <div class="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <lucide-icon name="log-out" class="h-6 w-6 text-red-600"></lucide-icon>
              </div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'SETTINGS.CONFIRM_LOGOUT' | translate }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ 'SETTINGS.CONFIRM_LOGOUT_MSG' | translate }}</p>
            </div>

            <div class="flex gap-2">
              <app-button variant="outline" class="flex-1" (onClick)="showLogoutModal.set(false)">
                {{ 'COMMON.CANCEL' | translate }}
              </app-button>
              <app-button
                customClass="flex-1 bg-red-600 hover:bg-red-700"
                (onClick)="confirmLogout()"
              >
                {{ 'SETTINGS.LOGOUT_BTN' | translate }}
              </app-button>
            </div>
          </div>
        </div>
      }

      <!-- Logout All Confirmation Modal -->
      @if (showLogoutAllModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showLogoutAllModal.set(false)">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6" (click)="$event.stopPropagation()">
            <div class="text-center mb-4">
              <div class="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <lucide-icon name="triangle-alert" class="h-6 w-6 text-red-600"></lucide-icon>
              </div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'SETTINGS.LOGOUT_ALL_TITLE' | translate }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ 'SETTINGS.LOGOUT_ALL_MSG' | translate }}</p>
            </div>

            <div class="flex gap-2">
              <app-button variant="outline" class="flex-1" (onClick)="showLogoutAllModal.set(false)">
                {{ 'COMMON.CANCEL' | translate }}
              </app-button>
              <app-button
                customClass="flex-1 bg-red-600 hover:bg-red-700"
                (onClick)="confirmLogoutAll()"
              >
                {{ 'SETTINGS.LOGOUT_ALL_BTN' | translate }}
              </app-button>
            </div>
          </div>
        </div>
      }
    </app-dashboard-layout>
  `
})
export class SettingsComponent implements OnInit {
  languageService = inject(LanguageService);
  themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  showLanguageDropdown = signal(false);
  showLogoutModal = signal(false);
  showLogoutAllModal = signal(false);

  notifPreferences = signal<NotificationPreferences>({
    emailEnabled: true,
    inAppEnabled: true,
    language: 'en'
  });

  availableLanguages: { code: AppLanguage; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'pt', label: 'Português' }
  ];

  themeOptions = [
    { value: 'light', labelKey: 'SETTINGS.THEME.LIGHT' },
    { value: 'dark', labelKey: 'SETTINGS.THEME.DARK' },
    { value: 'auto', labelKey: 'SETTINGS.THEME.AUTO' }
  ];

  ngOnInit(): void {
    this.notificationService.getPreferences().subscribe({
      next: (prefs) => this.notifPreferences.set(prefs),
      error: () => {}
    });
  }

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

  toggleEmailNotifications(): void {
    this.notifPreferences.update(p => ({ ...p, emailEnabled: !p.emailEnabled }));
    this.notificationService.updatePreferences(this.notifPreferences()).subscribe();
  }

  toggleInAppNotifications(): void {
    this.notifPreferences.update(p => ({ ...p, inAppEnabled: !p.inAppEnabled }));
    this.notificationService.updatePreferences(this.notifPreferences()).subscribe();
  }

  confirmLogout(): void {
    this.showLogoutModal.set(false);
    this.authService.logout();
  }

  confirmLogoutAll(): void {
    this.showLogoutAllModal.set(false);
    this.authService.logoutAll();
  }
}
