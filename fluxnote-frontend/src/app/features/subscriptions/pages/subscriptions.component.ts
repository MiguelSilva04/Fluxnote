import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent, WorkInProgressComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    BadgeComponent,
    WorkInProgressComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="max-w-7xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Subscription</h1>

        <!-- Tabs -->
        <div class="flex gap-1 mb-8 border-b border-gray-200">
          <button
            (click)="activeTab.set('plans')"
            [class]="'px-6 py-3 text-sm font-medium border-b-2 transition-colors ' + (activeTab() === 'plans' ? 'border-[#155347] text-[#155347]' : 'border-transparent text-gray-600 hover:text-gray-900')"
          >
            Subscription Plans
          </button>
        </div>

        @if (activeTab() === 'plans') {
          <!-- Plans Section -->
          <div class="mb-12">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              @for (plan of plans; track plan.name) {
                <app-card
                  [customClass]="'relative transition-all ' + (plan.current ? 'ring-4 ring-[#155347] shadow-2xl scale-105' : plan.recommended ? 'ring-2 ring-[#155347]/30' : 'hover:shadow-lg')"
                >
                  <!-- Current Plan Badge -->
                  @if (plan.current) {
                    <div class="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                      <app-badge customClass="bg-[#155347] text-white px-6 py-2.5 text-sm font-bold whitespace-nowrap shadow-lg flex items-center gap-1">
                        <lucide-icon name="star" class="h-4 w-4"></lucide-icon>
                        YOUR CURRENT PLAN
                      </app-badge>
                    </div>
                  }

                  <!-- Most Popular Badge -->
                  @if (plan.popular && !plan.current) {
                    <div class="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                      <app-badge customClass="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 text-sm font-bold whitespace-nowrap shadow-lg flex items-center gap-1">
                        <lucide-icon name="zap" class="h-4 w-4"></lucide-icon>
                        MOST POPULAR
                      </app-badge>
                    </div>
                  }

                  <app-card-content [customClass]="'p-6 ' + (plan.current ? 'bg-gradient-to-br from-[#e8f0ee] to-white rounded-xl' : '')">
                    <div class="text-center mb-6">
                      <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ plan.name }}</h3>
                      <div class="mb-2">
                        <span class="text-5xl font-bold text-gray-900">{{ plan.price }}</span>
                        @if (plan.period) {
                          <span class="text-xl text-gray-600">{{ plan.period }}</span>
                        }
                      </div>
                      @if (plan.billing) {
                        <p class="text-xs text-gray-500">{{ plan.billing }}</p>
                      }
                    </div>

                    <ul class="space-y-3 mb-6">
                      @for (feature of plan.features; track feature) {
                        <li class="flex items-start gap-3 text-sm text-gray-700">
                          <lucide-icon
                            name="check"
                            [class]="'h-5 w-5 shrink-0 mt-0.5 ' + (plan.current ? 'text-[#155347]' : 'text-gray-400')"
                          ></lucide-icon>
                          <span [class]="plan.current ? 'font-medium' : ''">{{ feature }}</span>
                        </li>
                      }
                    </ul>

                    <app-button
                      [variant]="plan.current ? 'primary' : plan.buttonVariant"
                      [customClass]="'w-full ' + (plan.current ? 'bg-[#155347] hover:bg-[#0d3d31] cursor-default' : plan.recommended ? 'bg-[#155347] hover:bg-[#0d3d31]' : '')"
                      [disabled]="plan.current"
                      (click)="!plan.current && showWipModal.set(true)"
                    >
                      {{ plan.buttonText }}
                    </app-button>
                  </app-card-content>
                </app-card>
              }
            </div>

            <!-- Plan Comparison Note -->
            <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p class="text-sm text-blue-900">
                <strong>💡 Tip:</strong> You're currently on the <strong>Pro Plan</strong>.
                Upgrade to Team for unlimited members and advanced features, or downgrade to save costs.
              </p>
            </div>
          </div>

          <!-- Current Usage -->
          <app-card customClass="mb-8">
            <app-card-content customClass="p-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Current Usage</h2>

              <div class="space-y-6">
                <!-- Documents Created -->
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-medium text-gray-700">Documents Created</span>
                    <span class="text-sm font-bold text-gray-900">120 of 200 documents</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div class="bg-[#155347] h-full rounded-full transition-all duration-500" style="width: 60%"></div>
                  </div>
                  <p class="text-xs text-gray-500 mt-2">You have 80 documents remaining in your plan</p>
                </div>

                <!-- AI Requests -->
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-medium text-gray-700">AI Requests Used</span>
                    <span class="text-sm font-bold text-gray-900">15,000 of 20,000 requests</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div class="bg-[#155347] h-full rounded-full transition-all duration-500" style="width: 75%"></div>
                  </div>
                  <p class="text-xs text-gray-500 mt-2">5,000 AI requests remaining this month</p>
                </div>

                <!-- Teams Created -->
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-medium text-gray-700">Teams Created</span>
                    <span class="text-sm font-bold text-gray-900">3 of 5 teams</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div class="bg-[#155347] h-full rounded-full transition-all duration-500" style="width: 60%"></div>
                  </div>
                  <p class="text-xs text-gray-500 mt-2">You can create 2 more teams</p>
                </div>
              </div>
            </app-card-content>
          </app-card>

          <!-- Payment Information -->
          <app-card>
            <app-card-content customClass="p-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Payment Information</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Credit Card Number</label>
                  <input
                    type="text"
                    placeholder="XXXX XXXX XXXX XXXX"
                    class="w-full h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Expiration Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    class="w-full h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">CVC</label>
                  <input
                    type="text"
                    placeholder="CVC"
                    class="w-full h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Billing Zip Code</label>
                  <input
                    type="text"
                    placeholder="Billing Zip Code"
                    class="w-full h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                  />
                </div>
              </div>
              <div class="mt-6">
                <app-button customClass="bg-[#155347] hover:bg-[#0d3d31]" (click)="showWipModal.set(true)">Update Payment Method</app-button>
              </div>
            </app-card-content>
          </app-card>
        }
      </div>

      <app-work-in-progress [show]="showWipModal()" (close)="showWipModal.set(false)" />
    </app-dashboard-layout>
  `
})
export class SubscriptionsComponent {
  activeTab = signal<'plans' | 'notifications'>('plans');
  showWipModal = signal(false);

  plans = [
    {
      name: 'Free',
      price: '$0',
      period: '',
      billing: '',
      features: ['Basic document editing', '5 documents', 'Community support'],
      current: false,
      buttonText: 'Downgrade',
      buttonVariant: 'outline' as const,
      popular: false,
      recommended: false
    },
    {
      name: 'Student',
      price: '$9',
      period: '/month',
      billing: 'per month, billed annually',
      features: ['All Free features', 'Unlimited documents', 'Academic templates', 'Email support'],
      current: false,
      buttonText: 'Upgrade to Student',
      buttonVariant: 'primary' as const,
      popular: false,
      recommended: false
    },
    {
      name: 'Pro',
      price: '$19',
      period: '/month',
      billing: 'per month, billed annually',
      features: ['All Student features', 'Version history', 'AI Assistant access', 'Priority support', 'Team collaboration (up to 5 users)'],
      current: true,
      popular: true,
      recommended: true,
      buttonText: 'Current Plan',
      buttonVariant: 'primary' as const
    },
    {
      name: 'Team',
      price: '$49',
      period: '/month',
      billing: 'per month, billed annually',
      features: ['All Pro features', 'Custom branding', 'Admin controls', 'Dedicated account manager', 'Unlimited team members'],
      current: false,
      buttonText: 'Upgrade to Team',
      buttonVariant: 'primary' as const,
      popular: false,
      recommended: false
    }
  ];
}
