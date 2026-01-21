import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { PanelStateService } from '../../core/services';
import { ButtonComponent } from '../../shared/components/ui';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent],
  template: `
    @if (panelState.isSettingsPanelOpen()) {
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/20 z-40" (click)="panelState.closeSettingsPanel()"></div>

      <!-- Side Panel -->
      <aside class="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-900">Settings</h2>
          <button (click)="panelState.closeSettingsPanel()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-8">
          <!-- Language Settings -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <lucide-icon name="globe" class="h-5 w-5 text-gray-600"></lucide-icon>
              <h3 class="text-base font-bold text-gray-900">Language</h3>
            </div>
            <select
              [(ngModel)]="language"
              class="w-full h-10 px-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#155347] bg-white"
            >
              <option value="pt-PT">Português (Portugal)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
              <option value="fr-FR">Français</option>
            </select>
          </div>

          <!-- Theme Settings -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <lucide-icon name="palette" class="h-5 w-5 text-gray-600"></lucide-icon>
              <h3 class="text-base font-bold text-gray-900">Theme</h3>
            </div>
            <div class="space-y-2">
              @for (option of themeOptions; track option.value) {
                <label class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
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
          </div>

          <!-- Notification Preferences -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <lucide-icon name="bell" class="h-5 w-5 text-gray-600"></lucide-icon>
              <h3 class="text-base font-bold text-gray-900">Notification Preferences</h3>
            </div>
            <div class="space-y-3">
              @for (notif of notificationOptions; track notif.key) {
                <label class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
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
          </div>

          <!-- Privacy & Security -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <lucide-icon name="shield" class="h-5 w-5 text-gray-600"></lucide-icon>
              <h3 class="text-base font-bold text-gray-900">Privacy & Security</h3>
            </div>
            <button class="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <lucide-icon name="key" class="h-5 w-5 text-gray-500"></lucide-icon>
              <span class="text-sm font-medium text-gray-900">Change Password</span>
            </button>
          </div>
        </div>

        <div class="p-6 border-t border-gray-200">
          <app-button (onClick)="panelState.closeSettingsPanel()" customClass="w-full bg-[#155347] hover:bg-[#0d3d31]">
            Save Changes
          </app-button>
        </div>
      </aside>
    }
  `
})
export class SettingsPanelComponent {
  panelState = inject(PanelStateService);

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
