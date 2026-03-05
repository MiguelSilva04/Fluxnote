import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="max-w-4xl">
        <div class="flex items-center justify-between mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Notification Settings</h1>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600 dark:text-gray-400">Do Not Disturb</span>
            <button
              (click)="doNotDisturb.set(!doNotDisturb())"
              [class]="'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (doNotDisturb() ? 'bg-[#155347]' : 'bg-gray-200 dark:bg-gray-700')"
            >
              <span
                [class]="'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (doNotDisturb() ? 'translate-x-6' : 'translate-x-1')"
              ></span>
            </button>
          </div>
        </div>

        <!-- Channel Tabs -->
        <div class="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          @for (tab of tabs; track tab.id) {
            <button
              (click)="activeTab.set(tab.id)"
              [class]="'px-6 py-3 text-sm font-medium border-b-2 transition-colors ' + (activeTab() === tab.id ? 'border-[#155347] text-[#155347]' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100')"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        <div class="space-y-6">
          <!-- Document Activity -->
          <app-card>
            <app-card-content customClass="p-6">
              <div class="flex items-center gap-3 mb-4">
                <lucide-icon name="file-text" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Document Activity</h2>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Get notified about changes to your documents</p>
              <div class="space-y-3">
                @for (notif of documentNotifications; track notif.key) {
                  <label class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ notif.label }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{{ notif.description }}</p>
                    </div>
                    <button
                      (click)="toggleSetting(notif.key)"
                      [class]="'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (settings()[notif.key] ? 'bg-[#155347]' : 'bg-gray-200 dark:bg-gray-700')"
                    >
                      <span
                        [class]="'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (settings()[notif.key] ? 'translate-x-6' : 'translate-x-1')"
                      ></span>
                    </button>
                  </label>
                }
              </div>
            </app-card-content>
          </app-card>

          <!-- Collaboration & Team -->
          <app-card>
            <app-card-content customClass="p-6">
              <div class="flex items-center gap-3 mb-4">
                <lucide-icon name="users" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Collaboration & Team</h2>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Notifications about team activities and collaboration</p>
              <div class="space-y-3">
                @for (notif of teamNotifications; track notif.key) {
                  <label class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ notif.label }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{{ notif.description }}</p>
                    </div>
                    <button
                      (click)="toggleSetting(notif.key)"
                      [class]="'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (settings()[notif.key] ? 'bg-[#155347]' : 'bg-gray-200 dark:bg-gray-700')"
                    >
                      <span
                        [class]="'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (settings()[notif.key] ? 'translate-x-6' : 'translate-x-1')"
                      ></span>
                    </button>
                  </label>
                }
              </div>
            </app-card-content>
          </app-card>

          <!-- System & Marketing -->
          <app-card>
            <app-card-content customClass="p-6">
              <div class="flex items-center gap-3 mb-4">
                <lucide-icon name="bell" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">System & Marketing</h2>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">System updates and promotional content</p>
              <div class="space-y-3">
                @for (notif of systemNotifications; track notif.key) {
                  <label class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ notif.label }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{{ notif.description }}</p>
                    </div>
                    <button
                      (click)="toggleSetting(notif.key)"
                      [class]="'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (settings()[notif.key] ? 'bg-[#155347]' : 'bg-gray-200 dark:bg-gray-700')"
                    >
                      <span
                        [class]="'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (settings()[notif.key] ? 'translate-x-6' : 'translate-x-1')"
                      ></span>
                    </button>
                  </label>
                }
              </div>
            </app-card-content>
          </app-card>

          <div class="flex justify-end">
            <app-button customClass="bg-[#155347] hover:bg-[#0d3d31]">Save Preferences</app-button>
          </div>
        </div>
      </div>
    </app-dashboard-layout>
  `
})
export class NotificationsComponent {
  doNotDisturb = signal(false);
  activeTab = signal('email');

  tabs = [
    { id: 'email', label: 'Email' },
    { id: 'push', label: 'Push' },
    { id: 'inapp', label: 'In-app' }
  ];

  settings = signal<Record<string, boolean>>({
    docShared: true,
    docComments: true,
    docMentions: true,
    teamInvites: true,
    teamUpdates: false,
    memberJoined: true,
    systemUpdates: true,
    productNews: false,
    tips: true
  });

  documentNotifications = [
    { key: 'docShared', label: 'Document shared', description: 'When someone shares a document with you' },
    { key: 'docComments', label: 'New comments', description: 'When someone comments on your documents' },
    { key: 'docMentions', label: 'Mentions', description: 'When someone mentions you in a document' }
  ];

  teamNotifications = [
    { key: 'teamInvites', label: 'Team invitations', description: 'When you are invited to join a team' },
    { key: 'teamUpdates', label: 'Team updates', description: 'Changes to team settings and permissions' },
    { key: 'memberJoined', label: 'New team members', description: 'When someone joins your team' }
  ];

  systemNotifications = [
    { key: 'systemUpdates', label: 'System updates', description: 'Important updates about Fluxnote' },
    { key: 'productNews', label: 'Product news', description: 'New features and improvements' },
    { key: 'tips', label: 'Tips & tutorials', description: 'Helpful tips to get the most out of Fluxnote' }
  ];

  toggleSetting(key: string): void {
    this.settings.update(s => ({ ...s, [key]: !s[key] }));
  }
}
