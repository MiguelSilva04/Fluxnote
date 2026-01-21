import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { SettingsPanelComponent, ProfilePanelComponent, NotificationsPanelComponent } from '../panels';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    HeaderComponent,
    SettingsPanelComponent,
    ProfilePanelComponent,
    NotificationsPanelComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 flex">
      <app-sidebar></app-sidebar>
      <div class="flex-1 flex flex-col ml-64">
        <app-header></app-header>
        <main class="flex-1 p-8">
          <ng-content></ng-content>
        </main>
      </div>

      <!-- Side Panels -->
      <app-settings-panel></app-settings-panel>
      <app-profile-panel></app-profile-panel>
      <app-notifications-panel></app-notifications-panel>
    </div>
  `
})
export class DashboardLayoutComponent {}
