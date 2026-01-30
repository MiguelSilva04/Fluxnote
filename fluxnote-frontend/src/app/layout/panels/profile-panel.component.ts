import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService, PanelStateService } from '../../core/services';
import { ButtonComponent, BadgeComponent } from '../../shared/components/ui';

@Component({
  selector: 'app-profile-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent, BadgeComponent],
  template: `
    @if (panelState.isProfilePanelOpen()) {
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/20 z-40" (click)="panelState.closeProfilePanel()"></div>

      <!-- Side Panel -->
      <aside class="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-900">Profile</h2>
          <button (click)="panelState.closeProfilePanel()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Profile Picture & Basic Info -->
          <div class="text-center">
            <div class="relative inline-block mb-4">
            <div class="h-24 w-24 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto"
                [style.background]="user()?.color">
              {{ user()?.initials }}
            </div>
              <div class="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-green-500 border-4 border-white"></div>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-1">{{ user()?.fullName }}</h3>
            <p class="text-sm text-gray-600">{{ user()?.email }}</p>
          </div>

          <!-- Quick Info -->
          <div class="space-y-3">
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <lucide-icon name="badge-euro" class="h-5 w-5 text-gray-500"></lucide-icon>
              <div>
                <p class="text-xs text-gray-500">Plan</p>
                <p class="text-sm font-medium text-gray-900">Professional</p>
              </div>
            </div>
          </div>

          <!-- Associated Teams -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <lucide-icon name="users" class="h-5 w-5 text-gray-600"></lucide-icon>
              <h4 class="text-base font-bold text-gray-900">Teams</h4>
            </div>
            <div class="space-y-2">
              @for (team of userTeams; track team.name) {
                <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span class="text-sm font-medium text-gray-900">{{ team.name }}</span>
                  <app-badge
                    [variant]="team.role === 'Owner' ? 'default' : 'outline'"
                    [customClass]="team.role === 'Owner' ? 'bg-[#155347]' : ''"
                  >
                    {{ team.role }}
                  </app-badge>
                </div>
              }
            </div>
          </div>

          <!-- Account Actions -->
          <div class="space-y-2">
            <button class="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <lucide-icon name="settings" class="h-5 w-5 text-gray-500"></lucide-icon>
              <span class="text-sm font-medium text-gray-900">Account Settings</span>
            </button>
          </div>
        </div>

        <div class="p-6 border-t border-gray-200">
          <app-button variant="outline" (onClick)="panelState.closeProfilePanel()" customClass="w-full">
            Close
          </app-button>
        </div>
      </aside>
    }
  `
})
export class ProfilePanelComponent {
  panelState = inject(PanelStateService);
  user = inject(AuthService).currentUser;

  userTeams = [
    { name: 'Marketing Team', role: 'Editor' },
    { name: 'Product Team', role: 'Owner' }
  ];
}
