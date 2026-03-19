import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { CardComponent, CardContentComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    DashboardLayoutComponent,
    CardComponent,
    CardContentComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="max-w-4xl mx-auto">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'HELP.FAQ_TITLE' | translate }}</h1>
          <p class="text-gray-600 dark:text-gray-400">{{ 'HELP.FAQ_SUBTITLE' | translate }}</p>
        </div>

        <div class="space-y-4">
          @for (faq of faqs; track faq.questionKey; let i = $index) {
            <app-card>
              <app-card-content customClass="p-0">
                <button
                  (click)="toggle(i)"
                  class="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-xl cursor-pointer"
                >
                  <span class="text-base font-semibold text-gray-900 dark:text-gray-100 pr-4">
                    {{ faq.questionKey | translate }}
                  </span>
                  <svg
                    [class]="'w-5 h-5 flex-shrink-0 text-[#155347] dark:text-emerald-400 transition-transform ' + (openIndex === i ? 'rotate-180' : '')"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                @if (openIndex === i) {
                  <div class="px-6 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <p class="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                      {{ faq.answerKey | translate }}
                    </p>
                  </div>
                }
              </app-card-content>
            </app-card>
          }
        </div>
      </div>
    </app-dashboard-layout>
  `
})
export class HelpComponent {
  openIndex: number | null = null;

  faqs = [
    { questionKey: 'HELP.FAQ_Q1', answerKey: 'HELP.FAQ_A1' },
    { questionKey: 'HELP.FAQ_Q2', answerKey: 'HELP.FAQ_A2' },
    { questionKey: 'HELP.FAQ_Q3', answerKey: 'HELP.FAQ_A3' },
    { questionKey: 'HELP.FAQ_Q4', answerKey: 'HELP.FAQ_A4' },
    { questionKey: 'HELP.FAQ_Q5', answerKey: 'HELP.FAQ_A5' },
    { questionKey: 'HELP.FAQ_Q6', answerKey: 'HELP.FAQ_A6' }
  ];

  toggle(index: number): void {
    this.openIndex = this.openIndex === index ? null : index;
  }
}
