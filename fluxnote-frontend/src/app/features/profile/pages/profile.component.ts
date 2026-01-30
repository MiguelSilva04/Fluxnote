import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent } from '../../../shared/components/ui';
import { AuthService } from '../../../core/services';

@Component({
  selector: 'app-profile',
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
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Profile</h1>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Profile Card -->
          <div class="lg:col-span-1">
            <app-card>
              <app-card-content customClass="p-6 text-center">
                <div class="relative inline-block mb-4">
                <div class="h-24 w-24 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto"
                  [style.background]="user()?.color">
                    {{user()?.initials || ''}}
                  </div>
                  <button class="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#155347] text-white flex items-center justify-center hover:bg-[#0d3d31] transition-colors">
                    <lucide-icon name="camera" class="h-4 w-4"></lucide-icon>
                  </button>
                </div>
                <h2 class="text-xl font-bold text-gray-900 mb-1">{{user()?.fullName || ''}}</h2>
                <p class="text-sm text-gray-600 mb-4">{{user()?.email || ''}}</p>
                <app-badge variant="default">Pro Plan</app-badge>
              </app-card-content>
            </app-card>
          </div>

          <!-- Profile Details -->
          <div class="lg:col-span-2 space-y-6">
            <app-card>
              <app-card-content customClass="p-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      [value]="user()?.fullName || ''"
                      class="w-full h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      [value]="user()?.email || ''"
                      class="w-full h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      [value]="user()?.phoneNumber || ''"
                      placeholder="+1 (555) 000-0000"
                      class="w-full h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      [value]="user()?.location || ''"
                      placeholder="City, Country"
                      class="w-full h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                    />
                  </div>
                </div>
                <div class="mt-4 flex justify-end">
                  <app-button customClass="bg-[#155347] hover:bg-[#0d3d31]">Save Changes</app-button>
                </div>
              </app-card-content>
            </app-card>

            <app-card>
              <app-card-content customClass="p-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4">Connected Accounts</h3>
                <div class="space-y-3">
                  <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div class="flex items-center gap-3">
                      <svg class="h-6 w-6" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <div>
                        <p class="text-sm font-medium text-gray-900">Google</p>
                        <p class="text-xs text-gray-500">Connected</p>
                      </div>
                    </div>
                    <app-button variant="outline" size="sm">Disconnect</app-button>
                  </div>
                  <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div class="flex items-center gap-3">
                      <svg class="h-6 w-6" viewBox="0 0 23 23">
                        <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                        <path fill="#f35325" d="M1 1h10v10H1z" />
                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                      </svg>
                      <div>
                        <p class="text-sm font-medium text-gray-900">Microsoft</p>
                        <p class="text-xs text-gray-500">Not connected</p>
                      </div>
                    </div>
                    <app-button variant="outline" size="sm">Connect</app-button>
                  </div>
                </div>
              </app-card-content>
            </app-card>

            <app-card>
              <app-card-content customClass="p-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4">Security</h3>
                <button class="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <lucide-icon name="key" class="h-5 w-5 text-gray-500"></lucide-icon>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Change Password</p>
                    <p class="text-xs text-gray-500">Last changed 30 days ago</p>
                  </div>
                </button>
              </app-card-content>
            </app-card>
          </div>
        </div>
      </div>
    </app-dashboard-layout>
  `
})
export class ProfileComponent {
  user = inject(AuthService).currentUser;
}
