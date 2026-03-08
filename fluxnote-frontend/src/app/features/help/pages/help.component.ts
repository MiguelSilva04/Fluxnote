import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslateModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-12">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-[#155347] rounded-full mb-4">
            <lucide-icon name="badge-question-mark" class="h-8 w-8 text-white"></lucide-icon>
          </div>
          <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'HELP.TITLE' | translate }}</h1>
          <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">{{ 'HELP.SUBTITLE' | translate }}</p>

          <!-- Search Bar -->
          <div class="max-w-2xl mx-auto relative">
            <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500"></lucide-icon>
            <input
              type="text"
              [placeholder]="'HELP.SEARCH_PLACEHOLDER' | translate"
              [(ngModel)]="searchQuery"
              class="w-full h-14 pl-12 pr-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-[#155347] focus:outline-none text-base shadow-sm"
            />
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <app-card customClass="hover:shadow-lg transition-shadow cursor-pointer">
            <app-card-content customClass="p-6 text-center">
              <div class="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <lucide-icon name="book" class="h-6 w-6 text-blue-600"></lucide-icon>
              </div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'HELP.DOCUMENTATION' | translate }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ 'HELP.DOCS_DESC' | translate }}</p>
              <app-button variant="outline" size="sm" customClass="w-full">{{ 'HELP.VIEW_DOCS' | translate }}</app-button>
            </app-card-content>
          </app-card>

          <app-card customClass="hover:shadow-lg transition-shadow cursor-pointer">
            <app-card-content customClass="p-6 text-center">
              <div class="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <lucide-icon name="message-circle" class="h-6 w-6 text-green-600"></lucide-icon>
              </div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'HELP.LIVE_CHAT' | translate }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ 'HELP.CHAT_DESC' | translate }}</p>
              <app-button variant="outline" size="sm" customClass="w-full">{{ 'HELP.START_CHAT' | translate }}</app-button>
            </app-card-content>
          </app-card>

          <app-card customClass="hover:shadow-lg transition-shadow cursor-pointer">
            <app-card-content customClass="p-6 text-center">
              <div class="inline-flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
                <lucide-icon name="mail" class="h-6 w-6 text-purple-600"></lucide-icon>
              </div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'HELP.EMAIL_SUPPORT' | translate }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ 'HELP.EMAIL_DESC' | translate }}</p>
              <app-button variant="outline" size="sm" customClass="w-full">{{ 'HELP.CONTACT_US' | translate }}</app-button>
            </app-card-content>
          </app-card>
        </div>

        <!-- Categories -->
        <div class="mb-12">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{{ 'HELP.BROWSE_CATEGORY' | translate }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (category of categories; track category.id) {
              <app-card customClass="hover:shadow-lg transition-shadow cursor-pointer">
                <app-card-content customClass="p-6">
                  <div class="flex items-start gap-4">
                    <div class="text-4xl">{{ category.icon }}</div>
                    <div class="flex-1">
                      <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{{ category.nameKey | translate }}</h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ category.descKey | translate }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{{ category.articles }} articles</p>
                    </div>
                    <lucide-icon name="chevron-right" class="h-5 w-5 text-gray-400 dark:text-gray-500"></lucide-icon>
                  </div>
                </app-card-content>
              </app-card>
            }
          </div>
        </div>

        <!-- FAQs -->
        <div class="mb-12">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{{ 'HELP.FAQ_TITLE' | translate }}</h2>
          <div class="space-y-4">
            @for (faq of faqs; track faq.questionKey) {
              <app-card>
                <app-card-content customClass="p-6">
                  <h4 class="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">{{ faq.questionKey | translate }}</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400">{{ faq.answerKey | translate }}</p>
                </app-card-content>
              </app-card>
            }
          </div>
        </div>


      </div>
    </app-dashboard-layout>
  `
})
export class HelpComponent {
  searchQuery = '';

  categories = [
    { id: 1, nameKey: 'HELP.CAT_STARTED', icon: '🚀', articles: 12, descKey: 'HELP.CAT_STARTED_DESC' },
    { id: 2, nameKey: 'HELP.CAT_COLLAB', icon: '👥', articles: 18, descKey: 'HELP.CAT_COLLAB_DESC' },
    { id: 3, nameKey: 'HELP.CAT_AI', icon: '🤖', articles: 15, descKey: 'HELP.CAT_AI_DESC' },
    { id: 4, nameKey: 'HELP.CAT_BILLING', icon: '💳', articles: 10, descKey: 'HELP.CAT_BILLING_DESC' }
  ];

  faqs = [
    { questionKey: 'HELP.FAQ_Q1', answerKey: 'HELP.FAQ_A1' },
    { questionKey: 'HELP.FAQ_Q2', answerKey: 'HELP.FAQ_A2' },
    { questionKey: 'HELP.FAQ_Q3', answerKey: 'HELP.FAQ_A3' },
    { questionKey: 'HELP.FAQ_Q4', answerKey: 'HELP.FAQ_A4' },
    { questionKey: 'HELP.FAQ_Q5', answerKey: 'HELP.FAQ_A5' },
    { questionKey: 'HELP.FAQ_Q6', answerKey: 'HELP.FAQ_A6' }
  ];
}
