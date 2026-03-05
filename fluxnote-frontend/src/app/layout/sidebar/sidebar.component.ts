import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService, PanelStateService } from '../../core/services';
import { ModalComponent, ButtonComponent } from '../../shared/components/ui';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule, ModalComponent, ButtonComponent, TranslateModule],
  template: `
    <!-- Backdrop (mobile/tablet) — fecha o sidebar ao clicar fora -->
    @if (panelState.isSidebarOpen()) {
      <div
      class="fixed inset-0 bg-black/40 z-30 lg:hidden"
        (click)="panelState.closeSidebar()"
      ></div>
    }

    <aside
      [class]="'w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 fixed left-0 top-0 h-screen flex flex-col z-40 transition-transform duration-300 ease-in-out ' +
               (panelState.isSidebarOpen() ? 'translate-x-0' : '-translate-x-full') +
               ' lg:translate-x-0'"
    >
      <a routerLink="/dashboard" (click)="panelState.closeSidebar()" class="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-center">
        <img src="assets/textIcon.png" alt="Fluxnote" class="h-auto w-auto dark:brightness-0 dark:invert" />
      </a>

      <nav class="flex-1 px-4 py-6 space-y-1">
        <a
          routerLink="/dashboard"
          routerLinkActive="bg-[#e8f0ee] dark:bg-emerald-900/30 text-[#155347] dark:text-emerald-400"
          [routerLinkActiveOptions]="{ exact: true }"
          data-tour="sidebar-dashboard"
          (click)="panelState.closeSidebar()"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <lucide-icon name="layout-dashboard" class="h-5 w-5"></lucide-icon>
          {{ 'SIDEBAR.DASHBOARD' | translate }}
        </a>
        <a
          routerLink="/teams"
          routerLinkActive="bg-[#e8f0ee] dark:bg-emerald-900/30 text-[#155347] dark:text-emerald-400"
          data-tour="sidebar-teams"
          (click)="panelState.closeSidebar()"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <lucide-icon name="users" class="h-5 w-5"></lucide-icon>
          {{ 'SIDEBAR.TEAMS' | translate }}
        </a>
        <a
          routerLink="/subscriptions"
          routerLinkActive="bg-[#e8f0ee] dark:bg-emerald-900/30 text-[#155347] dark:text-emerald-400"
          (click)="panelState.closeSidebar()"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <lucide-icon name="credit-card" class="h-5 w-5"></lucide-icon>
          {{ 'SIDEBAR.SUBSCRIPTIONS' | translate }}
        </a>
        <a
          routerLink="/profile"
          data-tour="sidebar-profile"
          routerLinkActive="bg-[#e8f0ee] dark:bg-emerald-900/30 text-[#155347] dark:text-emerald-400"
          (click)="panelState.closeSidebar()"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <lucide-icon name="user" class="h-5 w-5"></lucide-icon>
          {{ 'SIDEBAR.PROFILE' | translate }}
        </a>
        <a
          routerLink="/settings"
          routerLinkActive="bg-[#e8f0ee] dark:bg-emerald-900/30 text-[#155347] dark:text-emerald-400"
          (click)="panelState.closeSidebar()"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <lucide-icon name="settings" class="h-5 w-5"></lucide-icon>
          {{ 'SIDEBAR.SETTINGS' | translate }}
        </a>
      </nav>

      <div class="p-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <a
          routerLink="/help"
          routerLinkActive="bg-[#e8f0ee] dark:bg-emerald-900/30 text-[#155347] dark:text-emerald-400"
          (click)="panelState.closeSidebar()"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <lucide-icon name="badge-question-mark" class="h-5 w-5"></lucide-icon>
          {{ 'SIDEBAR.HELP' | translate }}
        </a>
        <a
          routerLink="/trash"
          routerLinkActive="bg-[#e8f0ee] dark:bg-emerald-900/30 text-[#155347] dark:text-emerald-400"
          (click)="panelState.closeSidebar()"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <lucide-icon name="trash-2" class="h-5 w-5"></lucide-icon>
          {{ 'SIDEBAR.TRASH' | translate }}
        </a>
        <button
          (click)="showLogoutModal.set(true)"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <lucide-icon name="log-out" class="h-5 w-5"></lucide-icon>
          {{ 'SIDEBAR.LOGOUT' | translate }}
        </button>
      </div>
    </aside>

    <!-- Modal de confirmação de logout -->
    <app-modal
      [isOpen]="showLogoutModal()"
      [title]="'SIDEBAR.CONFIRM_LOGOUT' | translate"
      maxWidth="sm"
      [hasFooter]="true"
      (onClose)="showLogoutModal.set(false)"
    >
      <div class="space-y-4">
        <p class="text-gray-600 dark:text-gray-400">
          {{ 'SIDEBAR.LOGOUT_MSG' | translate }}
        </p>
      </div>

      <div footer class="flex gap-3">
        <app-button
          variant="outline"
          (onClick)="showLogoutModal.set(false)"
          customClass="flex-1"
        >
          {{ 'COMMON.CANCEL' | translate }}
        </app-button>
        <app-button
          (onClick)="confirmLogout()"
          customClass="flex-1 bg-red-600 hover:bg-red-700 text-white"
        >
          {{ 'SIDEBAR.LOGOUT' | translate }}
        </app-button>
      </div>
    </app-modal>
  `
})
export class SidebarComponent {
  private authService = inject(AuthService);
  panelState = inject(PanelStateService);

  showLogoutModal = signal(false);

  confirmLogout(): void {
    this.showLogoutModal.set(false);
    this.authService.logout();
  }
}
