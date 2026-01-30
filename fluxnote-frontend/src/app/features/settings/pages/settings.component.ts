import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, WorkInProgressComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    WorkInProgressComponent
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
              <div
                (click)="showWipModal.set(true)"
                class="w-full max-w-xs h-10 px-4 rounded-lg border border-gray-300 text-sm bg-white flex items-center justify-between cursor-pointer hover:bg-gray-50"
              >
                <span class="text-gray-900">Português (Portugal)</span>
                <lucide-icon name="chevron-down" class="h-4 w-4 text-gray-500"></lucide-icon>
              </div>
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
                  <div
                    (click)="option.value !== theme && showWipModal.set(true)"
                    [class]="'flex items-center gap-3 p-3 border-2 rounded-lg transition-colors ' + (option.value === theme ? 'border-[#155347] bg-[#155347]/5' : 'border-gray-200 cursor-pointer hover:bg-gray-50')"
                  >
                    <div [class]="'w-4 h-4 rounded-full border-2 flex items-center justify-center ' + (option.value === theme ? 'border-[#155347]' : 'border-gray-300')">
                      @if (option.value === theme) {
                        <div class="w-2 h-2 rounded-full bg-[#155347]"></div>
                      }
                    </div>
                    <span class="text-sm font-medium text-gray-900">{{ option.label }}</span>
                  </div>
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
                  <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <span class="text-sm font-medium text-gray-900">{{ notif.label }}</span>
                    <button
                      (click)="showWipModal.set(true)"
                      [class]="'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ' + (notifications[notif.key] ? 'bg-[#155347]' : 'bg-gray-200')"
                    >
                      <span
                        [class]="'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (notifications[notif.key] ? 'translate-x-6' : 'translate-x-1')"
                      ></span>
                    </button>
                  </div>
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
              <button
                (click)="showWipModal.set(true)"
                class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
              >
                <lucide-icon name="key" class="h-5 w-5 text-gray-500"></lucide-icon>
                <div>
                  <p class="text-sm font-medium text-gray-900">Change Password</p>
                  <p class="text-xs text-gray-500">Update your account password</p>
                </div>
              </button>
            </app-card-content>
          </app-card>

          <div class="flex justify-end">
            <app-button (click)="showWipModal.set(true)" customClass="bg-[#155347] hover:bg-[#0d3d31]">Save Changes</app-button>
          </div>
        </div>
      </div>

      <app-work-in-progress [show]="showWipModal()" (close)="showWipModal.set(false)" />
    </app-dashboard-layout>
  `
})
export class SettingsComponent {
  theme = 'light';
  notifications: Record<string, boolean> = { email: true, push: true, desktop: false };
  showWipModal = signal(false);

  themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto (System)' }
  ];

  notificationOptions = [
    { key: 'email', label: 'Email Notifications' },
    { key: 'push', label: 'Push Notifications' },
    { key: 'desktop', label: 'Desktop Notifications' }
  ];
}
