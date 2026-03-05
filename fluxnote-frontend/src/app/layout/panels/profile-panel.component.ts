import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService, PanelStateService, TeamService } from '../../core/services';
import { ButtonComponent, BadgeComponent, WorkInProgressComponent } from '../../shared/components/ui';
import { Router, RouterLink } from "@angular/router";
import { TeamGet } from '../../core/models';

@Component({
  selector: 'app-profile-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule, ButtonComponent, BadgeComponent, WorkInProgressComponent, RouterLink],
  template: `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
           [class.opacity-0]="!panelState.isProfilePanelOpen()"
           [class.pointer-events-none]="!panelState.isProfilePanelOpen()"
           (click)="panelState.closeProfilePanel()"></div>

      <!-- Side Panel -->
      <aside class="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out"
             [class.translate-x-full]="!panelState.isProfilePanelOpen()"
             [attr.inert]="!panelState.isProfilePanelOpen() ? '' : null">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-900">{{ 'PROFILE_PANEL.TITLE' | translate }}</h2>
          <button (click)="panelState.closeProfilePanel()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Profile Picture & Basic Info -->
          <div class="text-center">
            <div class="relative inline-block mb-4">
              @if (user()?.profilePictureUrl) {
                <img
                  [src]="user()?.profilePictureUrl"
                  alt="Profile"
                  class="h-24 w-24 rounded-full object-cover mx-auto"
                />
              } @else {
                <div class="h-24 w-24 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto"
                    [style.background]="user()?.color">
                  {{ user()?.initials }}
                </div>
              }
              <div class="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-green-500 border-4 border-white"></div>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-1">{{ user()?.fullName }}</h3>
            @if (user()?.userName) {
              <p class="text-sm text-[#155347] font-medium mb-1">{{'@' + user()?.userName}}</p>
            }
            <p class="text-sm text-gray-600">{{ user()?.email }}</p>
            @if (user()?.bio) {
              <p class="text-sm text-gray-500 mt-2 italic">"{{ user()?.bio }}"</p>
            }
          </div>

          <!-- Quick Info -->
          <div class="space-y-3">
            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <lucide-icon name="badge-euro" class="h-5 w-5 text-gray-500"></lucide-icon>
              <div>
                <p class="text-xs text-gray-500">{{ 'PROFILE_PANEL.PLAN' | translate }}</p>
                <p class="text-sm font-medium text-gray-900">{{ 'PROFILE_PANEL.PLAN_VALUE' | translate }}</p>
              </div>
            </div>
            @if (user()?.createdAt) {
              <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <lucide-icon name="calendar" class="h-5 w-5 text-gray-500"></lucide-icon>
                <div>
                  <p class="text-xs text-gray-500">{{ 'PROFILE_PANEL.MEMBER_SINCE' | translate }}</p>
                  <p class="text-sm font-medium text-gray-900">{{ formatDate(user()?.createdAt) }}</p>
                </div>
              </div>
            }
            @if (user()?.timezone) {
              <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <lucide-icon name="clock" class="h-5 w-5 text-gray-500"></lucide-icon>
                <div>
                  <p class="text-xs text-gray-500">{{ 'PROFILE_PANEL.TIMEZONE' | translate }}</p>
                  <p class="text-sm font-medium text-gray-900">{{ user()?.timezone }}</p>
                </div>
              </div>
            }
          </div>

          <!-- Associated Teams -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <lucide-icon name="users" class="h-5 w-5 text-gray-600"></lucide-icon>
              <h4 class="text-base font-bold text-gray-900">{{ 'PROFILE_PANEL.TEAMS' | translate }}</h4>
            </div>
            <div class="space-y-2">
              @if (isLoadingTeams()) {
                <div class="flex items-center justify-center py-4">
                  <lucide-icon name="loader-circle" class="h-5 w-5 text-[#155347] animate-spin"></lucide-icon>
                </div>
              } @else if (userTeams().length === 0) {
                <p class="text-sm text-gray-500 text-center py-4">{{ 'PROFILE_PANEL.NO_TEAMS' | translate }}</p>
              } @else {
                @for (team of userTeams(); track team.id) {
                  <div 
                    (click)="goToTeam(team.id)"
                    class="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <span class="text-sm font-medium text-gray-900">{{ team.name }}</span>
                    <app-badge
                      [variant]="team.currentUserRole === 2 ? 'default' : 'outline'"
                      [customClass]="team.currentUserRole === 2 ? 'bg-[#155347]' : ''"
                    >
                      {{ getRoleName(team.currentUserRole) | translate }}
                    </app-badge>
                  </div>
                }
              }
            </div>
          </div>

          <!-- Account Actions -->
          <div class="space-y-2">
            <a
              routerLink="/profile"
              (click)="panelState.closeProfilePanel()"
              class="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer"
            >
              <lucide-icon name="user" class="h-5 w-5 text-gray-500"></lucide-icon>
              <span class="text-sm font-medium text-gray-900">{{ 'PROFILE_PANEL.ACCOUNT_SETTINGS' | translate }}</span>
            </a>
          </div>
        </div>

        <div class="p-6 border-t border-gray-200">
          <app-button variant="outline" (onClick)="panelState.closeProfilePanel()" customClass="w-full">
            {{ 'PROFILE_PANEL.CLOSE' | translate }}
          </app-button>
        </div>
      </aside>

      <app-work-in-progress [show]="showWipModal()" (close)="showWipModal.set(false)" />
  `
})
export class ProfilePanelComponent implements OnInit {
  panelState = inject(PanelStateService);
  user = inject(AuthService).currentUser;
  private teamService = inject(TeamService);
  private router = inject(Router);
  
  showWipModal = signal(false);
  userTeams = signal<TeamGet[]>([]);
  isLoadingTeams = signal(false);

  ngOnInit(): void {
    this.loadTeams();
  }

  loadTeams(): void {
    this.isLoadingTeams.set(true);
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        this.userTeams.set(teams);
        this.isLoadingTeams.set(false);
      },
      error: () => {
        this.userTeams.set([]);
        this.isLoadingTeams.set(false);
      }
    });
  }

  getRoleName(role: number): string {
    switch (role) {
      case 0: return 'ROLES.MEMBER';
      case 1: return 'ROLES.TEAM_ADMIN';
      case 2: return 'ROLES.OWNER';
      default: return 'ROLES.MEMBER';
    }
  }

  goToTeam(teamId: number): void {
    this.panelState.closeProfilePanel();
    this.router.navigate(['/team-detail', teamId]);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}
