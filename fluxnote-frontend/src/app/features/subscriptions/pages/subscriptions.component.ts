import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent, WorkInProgressComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslateModule,
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
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'SUBSCRIPTIONS.TITLE' | translate }}</h1>

        <!-- Work In Progress Warning -->
        <div class="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
          <p class="text-sm text-amber-900 dark:text-amber-200">{{ 'SUBSCRIPTIONS.WIP_WARNING' | translate }}</p>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 mb-8 border-b border-gray-200 dark:border-gray-700">
          <button
            (click)="activeTab.set('plans')"
            [class]="'px-6 py-3 text-sm font-medium border-b-2 transition-colors ' + (activeTab() === 'plans' ? 'border-[#155347] dark:border-emerald-400 text-[#155347] dark:text-emerald-400' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100')"
          >
            {{ 'SUBSCRIPTIONS.TAB_PLANS' | translate }}
          </button>
        </div>

        @if (activeTab() === 'plans') {
          <!-- Plans Section -->
          <div class="mb-12">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{{ 'SUBSCRIPTIONS.CHOOSE_PLAN' | translate }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              @for (plan of plans; track plan.name) {
                <app-card
                  [customClass]="'relative transition-all ' + (plan.current ? 'ring-4 ring-[#155347] dark:ring-emerald-500 shadow-2xl scale-105' : plan.recommended ? 'ring-2 ring-[#155347]/30 dark:ring-emerald-500/40' : 'hover:shadow-lg')"
                >
                  <!-- Current Plan Badge -->
                  @if (plan.current) {
                    <div class="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                      <app-badge customClass="bg-[#155347] text-white px-6 py-2.5 text-sm font-bold whitespace-nowrap shadow-lg flex items-center gap-1">
                        <lucide-icon name="star" class="h-4 w-4"></lucide-icon>
                        {{ 'SUBSCRIPTIONS.CURRENT_PLAN_BADGE' | translate }}
                      </app-badge>
                    </div>
                  }

                  <!-- Most Popular Badge -->
                  @if (plan.popular && !plan.current) {
                    <div class="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                      <app-badge customClass="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 text-sm font-bold whitespace-nowrap shadow-lg flex items-center gap-1">
                        <lucide-icon name="zap" class="h-4 w-4"></lucide-icon>
                        {{ 'SUBSCRIPTIONS.MOST_POPULAR_BADGE' | translate }}
                      </app-badge>
                    </div>
                  }

                  <app-card-content [customClass]="'p-6 ' + (plan.current ? 'bg-gradient-to-br from-[#e8f0ee] to-white dark:from-emerald-900/40 dark:to-gray-800 rounded-xl' : '')">
                    <div class="text-center mb-6">
                      <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ plan.name | translate }}</h3>
                      <div class="mb-2">
                        <span class="text-5xl font-bold text-gray-900 dark:text-gray-100">{{ plan.price }}</span>
                        @if (plan.period) {
                          <span class="text-xl text-gray-600 dark:text-gray-400">{{ plan.period | translate }}</span>
                        }
                      </div>
                      @if (plan.billing) {
                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ plan.billing | translate }}</p>
                      }
                    </div>

                    <ul class="space-y-3 mb-6">
                      @for (feature of plan.features; track feature) {
                        <li class="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <lucide-icon
                            name="check"
                            [class]="'h-5 w-5 shrink-0 mt-0.5 ' + (plan.current ? 'text-[#155347] dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500')"
                          ></lucide-icon>
                          <span [class]="plan.current ? 'font-medium' : ''">{{ feature | translate }}</span>
                        </li>
                      }
                    </ul>

                    <app-button
                      [variant]="plan.current ? 'primary' : plan.buttonVariant"
                      [customClass]="'w-full ' + (plan.current ? 'bg-[#155347] hover:bg-[#0d3d31] cursor-default' : plan.recommended ? 'bg-[#155347] hover:bg-[#0d3d31]' : '')"
                      [disabled]="plan.current"
                      (click)="!plan.current && showWipModal.set(true)"
                    >
                      {{ plan.buttonText | translate }}
                    </app-button>
                  </app-card-content>
                </app-card>
              }
            </div>

            <!-- Plan Comparison Note -->
            <div class="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p class="text-sm text-blue-900 dark:text-blue-200" [innerHTML]="'SUBSCRIPTIONS.TIP' | translate"></p>
            </div>
          </div>

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
      name: 'SUBSCRIPTIONS.FREE_PLAN',
      price: '$0',
      period: '',
      billing: '',
      features: ['SUBSCRIPTIONS.FREE_FEAT_1', 'SUBSCRIPTIONS.FREE_FEAT_2', 'SUBSCRIPTIONS.FREE_FEAT_3'],
      current: false,
      buttonText: 'SUBSCRIPTIONS.BTN_DOWNGRADE',
      buttonVariant: 'outline' as const,
      popular: false,
      recommended: false
    },
    {
      name: 'SUBSCRIPTIONS.STUDENT_PLAN',
      price: '$9',
      period: 'SUBSCRIPTIONS.PER_MONTH',
      billing: 'SUBSCRIPTIONS.BILLED_ANNUALLY',
      features: ['SUBSCRIPTIONS.STUDENT_FEAT_1', 'SUBSCRIPTIONS.STUDENT_FEAT_2', 'SUBSCRIPTIONS.STUDENT_FEAT_3', 'SUBSCRIPTIONS.STUDENT_FEAT_4'],
      current: false,
      buttonText: 'SUBSCRIPTIONS.BTN_UPGRADE_STUDENT',
      buttonVariant: 'primary' as const,
      popular: false,
      recommended: false
    },
    {
      name: 'SUBSCRIPTIONS.PRO_PLAN',
      price: '$19',
      period: 'SUBSCRIPTIONS.PER_MONTH',
      billing: 'SUBSCRIPTIONS.BILLED_ANNUALLY',
      features: ['SUBSCRIPTIONS.PRO_FEAT_1', 'SUBSCRIPTIONS.PRO_FEAT_2', 'SUBSCRIPTIONS.PRO_FEAT_3', 'SUBSCRIPTIONS.PRO_FEAT_4', 'SUBSCRIPTIONS.PRO_FEAT_5'],
      current: true,
      popular: true,
      recommended: true,
      buttonText: 'SUBSCRIPTIONS.BTN_CURRENT',
      buttonVariant: 'primary' as const
    },
    {
      name: 'SUBSCRIPTIONS.TEAM_PLAN',
      price: '$49',
      period: 'SUBSCRIPTIONS.PER_MONTH',
      billing: 'SUBSCRIPTIONS.BILLED_ANNUALLY',
      features: ['SUBSCRIPTIONS.TEAM_FEAT_1', 'SUBSCRIPTIONS.TEAM_FEAT_2', 'SUBSCRIPTIONS.TEAM_FEAT_3', 'SUBSCRIPTIONS.TEAM_FEAT_4', 'SUBSCRIPTIONS.TEAM_FEAT_5'],
      current: false,
      buttonText: 'SUBSCRIPTIONS.BTN_UPGRADE_TEAM',
      buttonVariant: 'primary' as const,
      popular: false,
      recommended: false
    }
  ];
}
