import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PanelStateService {
  readonly isSettingsPanelOpen = signal(false);
  readonly isProfilePanelOpen = signal(false);
  readonly isNotificationsPanelOpen = signal(false);

  // Sidebar mobile overlay
  readonly isSidebarOpen = signal(false);
  toggleSidebar(): void { this.isSidebarOpen.update(v => !v); }
  closeSidebar(): void  { this.isSidebarOpen.set(false); }

  openSettingsPanel(): void {
    this.closeAllPanels();
    this.isSettingsPanelOpen.set(true);
  }

  openProfilePanel(): void {
    this.closeAllPanels();
    this.isProfilePanelOpen.set(true);
  }

  openNotificationsPanel(): void {
    this.closeAllPanels();
    this.isNotificationsPanelOpen.set(true);
  }

  closeSettingsPanel(): void {
    this.isSettingsPanelOpen.set(false);
  }

  closeProfilePanel(): void {
    this.isProfilePanelOpen.set(false);
  }

  closeNotificationsPanel(): void {
    this.isNotificationsPanelOpen.set(false);
  }

  closeAllPanels(): void {
    this.isSettingsPanelOpen.set(false);
    this.isProfilePanelOpen.set(false);
    this.isNotificationsPanelOpen.set(false);
  }
}
