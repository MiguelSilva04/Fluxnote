import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService, PanelStateService } from '../../core/services';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <header class="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-4 flex-1">
        <div class="relative max-w-md w-full">
          <lucide-icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
          <input
            type="text"
            placeholder="Search documents..."
            class="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#155347] focus:border-transparent text-sm"
          />
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          (click)="panelState.openNotificationsPanel()"
          class="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <lucide-icon name="bell" class="h-5 w-5"></lucide-icon>
          <span class="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>
        <button
          (click)="panelState.openSettingsPanel()"
          class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <lucide-icon name="settings" class="h-5 w-5"></lucide-icon>
        </button>
        <button
          (click)="panelState.openProfilePanel()"
          class="h-9 w-9 rounded-full text-white flex items-center justify-center text-sm font-medium hover:opacity-90 transition-opacity overflow-hidden"
          [style.background]="user()?.profilePictureUrl ? 'transparent' : user()?.color"
        >
          @if (user()?.profilePictureUrl) {
            <img
              [src]="user()?.profilePictureUrl"
              alt="Profile"
              class="h-full w-full object-cover"
            />
          } @else {
            {{ user()?.initials }}
          }
        </button>
      </div>
    </header>
  `
})
export class HeaderComponent {
  panelState = inject(PanelStateService);
  user = inject(AuthService).currentUser;
}
