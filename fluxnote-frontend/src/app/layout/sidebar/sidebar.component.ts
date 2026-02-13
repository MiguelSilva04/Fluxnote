import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services';
import { ModalComponent, ButtonComponent } from '../../shared/components/ui';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule, ModalComponent, ButtonComponent],
  template: `
    <aside class="w-64 bg-white border-r border-gray-200 fixed left-0 top-0 h-screen flex flex-col">
      <a routerLink="/dashboard" class="p-6 border-b border-gray-100 flex items-center justify-center">
        <img src="assets/textIcon.png" alt="Fluxnote" class="h-auto w-auto" />
      </a>

      <nav class="flex-1 px-4 py-6 space-y-1">
        <a
          routerLink="/dashboard"
          routerLinkActive="bg-[#e8f0ee] text-[#155347]"
          [routerLinkActiveOptions]="{ exact: true }"
          data-tour="sidebar-dashboard"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <lucide-icon name="layout-dashboard" class="h-5 w-5"></lucide-icon>
          Dashboard
        </a>
        <a
          routerLink="/teams"
          routerLinkActive="bg-[#e8f0ee] text-[#155347]"
          data-tour="sidebar-teams"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <lucide-icon name="users" class="h-5 w-5"></lucide-icon>
          Teams
        </a>
        <a
          routerLink="/subscriptions"
          routerLinkActive="bg-[#e8f0ee] text-[#155347]"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <lucide-icon name="credit-card" class="h-5 w-5"></lucide-icon>
          Subscriptions
        </a>
        <a
          routerLink="/profile"
          data-tour="sidebar-profile"
          routerLinkActive="bg-[#e8f0ee] text-[#155347]"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <lucide-icon name="user" class="h-5 w-5"></lucide-icon>
          Profile
        </a>
        <a
          routerLink="/settings"
          routerLinkActive="bg-[#e8f0ee] text-[#155347]"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <lucide-icon name="settings" class="h-5 w-5"></lucide-icon>
          Settings
        </a>
      </nav>

      <div class="p-4 border-t border-gray-200 space-y-1">
        <a
          routerLink="/help"
          routerLinkActive="bg-[#e8f0ee] text-[#155347]"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <lucide-icon name="badge-question-mark" class="h-5 w-5"></lucide-icon>
          Help & Support
        </a>
        <a
          routerLink="/trash"
          routerLinkActive="bg-[#e8f0ee] text-[#155347]"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <lucide-icon name="trash-2" class="h-5 w-5"></lucide-icon>
          Trash
        </a>
        <button
          (click)="showLogoutModal.set(true)"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <lucide-icon name="log-out" class="h-5 w-5"></lucide-icon>
          Logout
        </button>
      </div>
    </aside>

    <!-- Modal de confirmação de logout -->
    <app-modal
      [isOpen]="showLogoutModal()"
      title="Confirm logout"
      maxWidth="sm"
      [hasFooter]="true"
      (onClose)="showLogoutModal.set(false)"
    >
      <div class="space-y-4">
        <p class="text-gray-600">
          Are you sure that want to logout of your session?
        </p>
      </div>

      <div footer class="flex gap-3">
        <app-button
          variant="outline"
          (onClick)="showLogoutModal.set(false)"
          customClass="flex-1"
        >
          Cancel
        </app-button>
        <app-button
          (onClick)="confirmLogout()"
          customClass="flex-1 bg-red-600 hover:bg-red-700 text-white"
        >
          Logout
        </app-button>
      </div>
    </app-modal>
  `
})
export class SidebarComponent {
  private authService = inject(AuthService);

  showLogoutModal = signal(false);

  confirmLogout(): void {
    this.showLogoutModal.set(false);
    this.authService.logout();
  }
}
