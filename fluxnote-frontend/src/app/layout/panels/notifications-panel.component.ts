import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { PanelStateService } from '../../core/services';
import { ButtonComponent } from '../../shared/components/ui';

interface NotificationItem {
  id: number;
  type: string;
  icon: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent],
  template: `
    @if (panelState.isNotificationsPanelOpen()) {
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/20 z-40" (click)="panelState.closeNotificationsPanel()"></div>

      <!-- Side Panel -->
      <aside class="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Notifications</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ unreadCount }} unread notifications</p>
          </div>
          <button (click)="panelState.closeNotificationsPanel()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          @for (notification of notifications; track notification.id) {
            <div
              [class]="'px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ' + (notification.unread ? 'bg-blue-50/50' : '')"
            >
              <div class="flex gap-3">
                <div [class]="'p-2 rounded-lg shrink-0 ' + (notification.unread ? 'bg-[#155347]' : 'bg-gray-100')">
                  <lucide-icon
                    [name]="notification.icon"
                    [class]="'h-5 w-5 ' + (notification.unread ? 'text-white' : 'text-gray-500')"
                  ></lucide-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h4 class="text-sm font-semibold text-gray-900">{{ notification.title }}</h4>
                    @if (notification.unread) {
                      <span class="h-2 w-2 rounded-full bg-[#155347] shrink-0 mt-1.5"></span>
                    }
                  </div>
                  <p class="text-sm text-gray-600 mb-2">{{ notification.message }}</p>
                  <div class="flex items-center gap-1.5 text-xs text-gray-500">
                    <lucide-icon name="clock" class="h-3 w-3"></lucide-icon>
                    <span>{{ notification.time }}</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="p-6 border-t border-gray-200 space-y-2">
          <app-button variant="outline" customClass="w-full">
            Mark all as read
          </app-button>
          <app-button (onClick)="panelState.closeNotificationsPanel()" customClass="w-full bg-[#155347] hover:bg-[#0d3d31]">
            Close
          </app-button>
        </div>
      </aside>
    }
  `
})
export class NotificationsPanelComponent {
  panelState = inject(PanelStateService);

  notifications: NotificationItem[] = [
    { id: 1, type: 'document', icon: 'file-text', title: 'Document shared with you', message: 'Sarah Kim shared "Q3 Marketing Strategy" with you', time: '5 minutes ago', unread: true },
    { id: 2, type: 'comment', icon: 'message-square', title: 'New comment', message: 'John Doe commented on "Product Roadmap 2024"', time: '1 hour ago', unread: true },
    { id: 3, type: 'team', icon: 'users', title: 'Team invitation', message: 'You were added to "Design Team"', time: '3 hours ago', unread: false },
    { id: 4, type: 'document', icon: 'file-text', title: 'Document updated', message: 'Mike Chen updated "Project Proposal"', time: 'Yesterday', unread: false }
  ];

  get unreadCount(): number {
    return this.notifications.filter(n => n.unread).length;
  }
}
