import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PanelStateService } from '../../core/services';
import { ButtonComponent, WorkInProgressComponent } from '../../shared/components/ui';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, ButtonComponent, WorkInProgressComponent],
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
            <div
              (click)="showWipModal.set(true)"
              class="w-full h-10 px-4 rounded-lg border border-gray-300 text-sm bg-white flex items-center justify-between cursor-pointer hover:bg-gray-50"
            >
              <span class="text-gray-900">English (US)</span>
              <lucide-icon name="chevron-down" class="h-4 w-4 text-gray-500"></lucide-icon>
            </div>
          </div>

          <!-- Theme Settings -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <lucide-icon name="palette" class="h-5 w-5 text-gray-600"></lucide-icon>
              <h3 class="text-base font-bold text-gray-900">Theme</h3>
            </div>
            <div class="space-y-2">
              @for (option of themeOptions; track option.value) {
                <div
                  (click)="option.value !== theme && showWipModal.set(true)"
                  [class]="'flex items-center gap-3 p-3 border rounded-lg transition-colors ' + (option.value === theme ? 'border-[#155347] bg-[#155347]/5' : 'border-gray-200 cursor-pointer hover:bg-gray-50')"
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
          </div>

          <!-- Notification Preferences -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <lucide-icon name="bell" class="h-5 w-5 text-gray-600"></lucide-icon>
              <h3 class="text-base font-bold text-gray-900">Notification Preferences</h3>
            </div>
            <div class="space-y-3">
              @for (notif of notificationOptions; track notif.key) {
                <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
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
          </div>
          
          <div class="space-y-2">
            <a
              routerLink="/settings"
              (click)="panelState.closeSettingsPanel()"
              class="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer"
            >
              <lucide-icon name="settings" class="h-5 w-5 text-gray-500"></lucide-icon>
              <span class="text-sm font-medium text-gray-900">Settings</span>
            </a>
          </div>
        </div>

        <div class="p-6 border-t border-gray-200">
          <app-button (onClick)="showWipModal.set(true)" customClass="w-full bg-[#155347] hover:bg-[#0d3d31]">
            Save Changes
          </app-button>
        </div>
      </aside>

      <app-work-in-progress [show]="showWipModal()" (close)="showWipModal.set(false)" />
    }
  `
})
export class SettingsPanelComponent {
  panelState = inject(PanelStateService);
  showWipModal = signal(false);

  theme = 'light';
  notifications: Record<string, boolean> = { email: true, push: true, desktop: false };

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
