import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    BadgeComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="max-w-4xl">
        <!-- Header -->
        <div class="flex items-center gap-4 mb-8">
          <button (click)="goBack()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <lucide-icon name="arrow-left" class="h-5 w-5 text-gray-600"></lucide-icon>
          </button>
          <div class="flex items-center gap-4 flex-1">
            <div class="h-16 w-16 rounded-full bg-[#155347] text-white flex items-center justify-center text-xl font-bold">
              PA
            </div>
            <div>
              <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold text-gray-900">Projeto Alfa</h1>
                <app-badge variant="default">Owner</app-badge>
              </div>
              <p class="text-gray-600">7 members • Last activity 2 hours ago</p>
            </div>
          </div>
          <app-button variant="outline" [leftIcon]="true">
            <lucide-icon leftIcon name="settings" class="h-4 w-4"></lucide-icon>
            Team Settings
          </app-button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Members Section -->
          <div class="lg:col-span-2">
            <app-card>
              <app-card-content customClass="p-6">
                <div class="flex items-center justify-between mb-6">
                  <h2 class="text-lg font-bold text-gray-900">Team Members</h2>
                  <app-button size="sm" [leftIcon]="true">
                    <lucide-icon leftIcon name="user-plus" class="h-4 w-4"></lucide-icon>
                    Invite Member
                  </app-button>
                </div>

                <div class="space-y-4">
                  @for (member of members; track member.id) {
                    <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div class="flex items-center gap-4">
                        <div
                          class="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          [style.backgroundColor]="member.color"
                        >
                          {{ member.initials }}
                        </div>
                        <div>
                          <p class="text-sm font-medium text-gray-900">{{ member.name }}</p>
                          <p class="text-xs text-gray-500">{{ member.email }}</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-4">
                        <app-badge [variant]="member.role === 'Owner' ? 'default' : 'outline'">{{ member.role }}</app-badge>
                        <button class="p-1 hover:bg-gray-100 rounded">
                          <lucide-icon name="more-vertical" class="h-4 w-4 text-gray-400"></lucide-icon>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </app-card-content>
            </app-card>
          </div>

          <!-- Stats Section -->
          <div class="space-y-6">
            <app-card>
              <app-card-content customClass="p-6">
                <h3 class="text-sm font-semibold text-gray-900 mb-4">Team Stats</h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Documents</span>
                    <span class="text-sm font-bold text-gray-900">12</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Active Members</span>
                    <span class="text-sm font-bold text-gray-900">7</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-600">Created</span>
                    <span class="text-sm font-bold text-gray-900">Jan 15, 2024</span>
                  </div>
                </div>
              </app-card-content>
            </app-card>

            <app-card>
              <app-card-content customClass="p-6">
                <h3 class="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div class="space-y-3">
                  @for (activity of recentActivity; track activity.id) {
                    <div class="flex items-start gap-3">
                      <div class="h-2 w-2 rounded-full bg-[#155347] mt-1.5"></div>
                      <div>
                        <p class="text-sm text-gray-900">{{ activity.action }}</p>
                        <p class="text-xs text-gray-500">{{ activity.time }}</p>
                      </div>
                    </div>
                  }
                </div>
              </app-card-content>
            </app-card>
          </div>
        </div>
      </div>
    </app-dashboard-layout>
  `
})
export class TeamDetailComponent {
  private router = inject(Router);

  members = [
    { id: 1, name: 'Alex Morgan', email: 'alex.morgan@fluxnote.com', role: 'Owner', initials: 'AM', color: '#155347' },
    { id: 2, name: 'Sarah Kim', email: 'sarah.kim@fluxnote.com', role: 'Team Admin', initials: 'SK', color: '#3B82F6' },
    { id: 3, name: 'John Doe', email: 'john.doe@fluxnote.com', role: 'Editor', initials: 'JD', color: '#8B5CF6' },
    { id: 4, name: 'Maria Santos', email: 'maria.santos@fluxnote.com', role: 'Viewer', initials: 'MS', color: '#EC4899' }
  ];

  recentActivity = [
    { id: 1, action: 'Sarah Kim edited "Project Plan"', time: '2 hours ago' },
    { id: 2, action: 'John Doe added a comment', time: '4 hours ago' },
    { id: 3, action: 'Alex Morgan shared a document', time: 'Yesterday' }
  ];

  goBack(): void {
    this.router.navigate(['/teams']);
  }
}
