import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, BadgeComponent, ModalComponent, InputComponent } from '../../../shared/components/ui';
import { TeamService } from '../../../core/services';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    ModalComponent,
    InputComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="flex flex-col gap-6">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900">My Teams</h1>
          <div class="flex items-center gap-3">
            <div class="relative">
              <lucide-icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
              <input
                type="text"
                placeholder="Search teams..."
                [(ngModel)]="searchQuery"
                class="h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#155347] focus:border-transparent text-sm w-64"
              />
            </div>
            <select class="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#155347]">
              <option>Filter by Role</option>
              <option>Owner</option>
              <option>Team Admin</option>
              <option>Member</option>
              <option>Viewer</option>
            </select>
            <app-button (onClick)="isCreateModalOpen.set(true)" [leftIcon]="true">
              <lucide-icon leftIcon name="plus" class="h-4 w-4"></lucide-icon>
              Create Team
            </app-button>
          </div>
        </div>

        <!-- Teams List -->
        <div class="space-y-4">
          @for (team of teams(); track team.id) {
            <app-card customClass="overflow-hidden">
              <div class="p-6">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4 flex-1">
                    <div class="h-12 w-12 rounded-full bg-[#155347] text-white flex items-center justify-center text-sm font-bold">
                      {{ team.avatar }}
                    </div>
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-1">
                        <h3 class="text-lg font-bold text-gray-900">{{ team.name }}</h3>
                        <app-badge [variant]="teamService.getRoleBadgeVariant(team.role)">{{ team.role }}</app-badge>
                        <span class="text-sm text-gray-500">Activity {{ team.lastActivity }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <lucide-icon name="users" class="h-4 w-4"></lucide-icon>
                      <span>{{ team.members }} Members</span>
                    </div>
                    <app-button
                      variant="outline"
                      size="sm"
                      customClass="text-[#155347] border-[#155347]"
                      (onClick)="handleViewTeamDetails(team.id)"
                    >
                      View Team Details
                    </app-button>
                    <button (click)="toggleTeam(team.id)" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <lucide-icon
                        [name]="expandedTeam() === team.id ? 'chevron-up' : 'chevron-down'"
                        class="h-5 w-5 text-gray-500"
                      ></lucide-icon>
                    </button>
                  </div>
                </div>

                <!-- Expanded Documents Section -->
                @if (expandedTeam() === team.id && team.documents.length > 0) {
                  <div class="mt-6 pt-6 border-t border-gray-100">
                    <div class="space-y-2">
                      @for (doc of team.documents; track doc.id) {
                        <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                          <div class="flex items-center gap-3 flex-1">
                            <lucide-icon name="file-text" class="h-4 w-4 text-gray-400"></lucide-icon>
                            <span class="text-sm font-medium text-gray-900">{{ doc.name }}</span>
                          </div>
                          <div class="flex items-center gap-4">
                            <span class="text-xs text-gray-500">{{ doc.lastEdited }}</span>
                            <app-badge variant="outline" customClass="text-xs">My role: {{ doc.myRole }}</app-badge>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </app-card>
          }
        </div>
      </div>

      <!-- Create Team Modal -->
      <app-modal
        [isOpen]="isCreateModalOpen()"
        title="Create New Team"
        (onClose)="isCreateModalOpen.set(false)"
        [hasFooter]="true"
      >
        <div class="space-y-4">
          <app-input label="Team Name" placeholder="e.g. Design Team" [(ngModel)]="newTeamName"></app-input>
          <app-input label="Description" placeholder="What is this team for?" [(ngModel)]="newTeamDescription"></app-input>
        </div>
        <div footer class="flex gap-3">
          <app-button variant="ghost" (onClick)="isCreateModalOpen.set(false)">Cancel</app-button>
          <app-button (onClick)="createTeam()">Create Team</app-button>
        </div>
      </app-modal>
    </app-dashboard-layout>
  `
})
export class TeamsComponent {
  private router = inject(Router);
  teamService = inject(TeamService);

  teams = this.teamService.teams;
  expandedTeam = signal<number | null>(1);
  isCreateModalOpen = signal(false);
  searchQuery = '';
  newTeamName = '';
  newTeamDescription = '';

  toggleTeam(teamId: number): void {
    this.expandedTeam.update(current => current === teamId ? null : teamId);
  }

  handleViewTeamDetails(teamId: number): void {
    this.router.navigate(['/team-detail']);
  }

  createTeam(): void {
    if (this.newTeamName) {
      this.teamService.createTeam(this.newTeamName, this.newTeamDescription);
      this.isCreateModalOpen.set(false);
      this.newTeamName = '';
      this.newTeamDescription = '';
    }
  }
}
