import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="max-w-4xl">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        <div class="space-y-6">
          <!-- Language Settings -->
          <app-card>
            <app-card-content customClass="p-6">
              <div class="flex items-center gap-3 mb-4">
                <lucide-icon name="globe" class="h-5 w-5 text-gray-600"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900">Language</h2>
              </div>
              <p class="text-sm text-gray-600 mb-4">Choose your preferred language for the interface</p>
              <select
                [(ngModel)]="language"
                class="w-full max-w-xs h-10 px-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#155347] bg-white"
              >
                <option value="pt-PT">Português (Portugal)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
                <option value="fr-FR">Français</option>
              </select>
            </app-card-content>
          </app-card>

          <!-- Theme Settings -->
          <app-card>
            <app-card-content customClass="p-6">
              <div class="flex items-center gap-3 mb-4">
                <lucide-icon name="palette" class="h-5 w-5 text-gray-600"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900">Theme</h2>
              </div>
              <p class="text-sm text-gray-600 mb-4">Select your preferred color theme</p>
              <div class="space-y-3 max-w-xs">
                @for (option of themeOptions; track option.value) {
                  <label class="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="theme"
                      [value]="option.value"
                      [(ngModel)]="theme"
                      class="text-[#155347] focus:ring-[#155347]"
                    />
                    <span class="text-sm font-medium text-gray-900">{{ option.label }}</span>
                  </label>
                }
              </div>
            </app-card-content>
          </app-card>

          <!-- Notification Preferences -->
          <app-card>
            <app-card-content customClass="p-6">
              <div class="flex items-center gap-3 mb-4">
                <lucide-icon name="bell" class="h-5 w-5 text-gray-600"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900">Notification Preferences</h2>
              </div>
              <p class="text-sm text-gray-600 mb-4">Manage how you receive notifications</p>
              <div class="space-y-3">
                @for (notif of notificationOptions; track notif.key) {
                  <label class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <span class="text-sm font-medium text-gray-900">{{ notif.label }}</span>
                    <button
                      (click)="toggleNotification(notif.key)"
                      [class]="'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (notifications()[notif.key] ? 'bg-[#155347]' : 'bg-gray-200')"
                    >
                      <span
                        [class]="'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (notifications()[notif.key] ? 'translate-x-6' : 'translate-x-1')"
                      ></span>
                    </button>
                  </label>
                }
              </div>
            </app-card-content>
          </app-card>

          <!-- Privacy & Security -->
          <app-card>
            <app-card-content customClass="p-6">
              <div class="flex items-center gap-3 mb-4">
                <lucide-icon name="shield" class="h-5 w-5 text-gray-600"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900">Privacy & Security</h2>
              </div>
              <p class="text-sm text-gray-600 mb-4">Manage your account security settings</p>
              <button class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full text-left">
                <lucide-icon name="key" class="h-5 w-5 text-gray-500"></lucide-icon>
                <div>
                  <p class="text-sm font-medium text-gray-900">Change Password</p>
                  <p class="text-xs text-gray-500">Update your account password</p>
                </div>
              </button>
            </app-card-content>
          </app-card>

          <div class="flex justify-end">
            <app-button customClass="bg-[#155347] hover:bg-[#0d3d31]">Save Changes</app-button>
          </div>
        </div>
      </div>
    </app-dashboard-layout>
  `
})
export class SettingsComponent {
  language = 'pt-PT';
  theme = 'light';
  notifications = signal({ email: true, push: true, desktop: false });

  themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto (System)' }
  ];

  notificationOptions = [
    { key: 'email' as const, label: 'Email Notifications' },
    { key: 'push' as const, label: 'Push Notifications' },
    { key: 'desktop' as const, label: 'Desktop Notifications' }
  ];

  toggleNotification(key: 'email' | 'push' | 'desktop'): void {
    this.notifications.update(n => ({ ...n, [key]: !n[key] }));
  }
}
