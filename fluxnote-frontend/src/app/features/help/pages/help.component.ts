import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, TranslateModule, DashboardLayoutComponent],
  template: `
    <app-dashboard-layout>
      <div class="max-w-3xl mx-auto">

        <!-- Header -->
        <div class="bg-gradient-to-br from-[#155347]/10 to-transparent rounded-2xl p-8 mb-8 border border-[#155347]/10">
          <div class="flex items-start gap-4 mb-6">
            <div class="w-12 h-12 bg-[#155347] rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {{ 'HELP.FAQ_TITLE' | translate }}
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ 'HELP.FAQ_SUBTITLE' | translate }}
              </p>
            </div>
          </div>

          <!-- Search -->
          <div class="relative">
            <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              [placeholder]="'HELP.SEARCH_PLACEHOLDER' | translate"
              [value]="query()"
              (input)="onSearch($any($event.target).value)"
              class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#155347]/30 focus:border-[#155347]/50 transition"
            />
          </div>
        </div>

        <!-- Results count -->
        @if (query()) {
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 px-1">
            {{ filteredFaqs.length }} / {{ faqs.length }} {{ 'HELP.FAQ_RESULTS' | translate }}
          </p>
        }

        <!-- FAQ list -->
        <div class="space-y-3">
          @for (faq of filteredFaqs; track faq.questionKey) {
            <div
              class="rounded-xl border overflow-hidden transition-all duration-200"
              [ngClass]="openKey === faq.questionKey ? 'border-[#155347]/40 shadow-sm' : 'border-gray-200 dark:border-gray-700'"
            >
              <!-- Question -->
              <button
                (click)="toggle(faq.questionKey)"
                class="w-full px-5 py-4 text-left flex items-center gap-4 transition-colors cursor-pointer"
                [ngClass]="openKey === faq.questionKey ? 'bg-[#155347]/5 dark:bg-[#155347]/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'"
              >
                <!-- Icon -->
                <div
                  class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                  [ngClass]="faq.iconBg"
                >
                  {{ faq.icon }}
                </div>

                <div class="flex-1 min-w-0">
                  <!-- Category chip -->
                  <span
                    class="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1"
                    [ngClass]="faq.badgeClass"
                  >
                    {{ faq.categoryKey | translate }}
                  </span>
                  <!-- Question text -->
                  <p class="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-snug">
                    {{ faq.questionKey | translate }}
                  </p>
                </div>

                <!-- Chevron -->
                <svg
                  class="w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200"
                  [class.rotate-180]="openKey === faq.questionKey"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Answer -->
              @if (openKey === faq.questionKey) {
                <div class="px-5 pb-5 pt-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/20">
                  <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-[52px]">
                    {{ faq.answerKey | translate }}
                  </p>
                </div>
              }
            </div>
          }

          <!-- Empty search state -->
          @if (filteredFaqs.length === 0) {
            <div class="text-center py-16">
              <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                {{ 'HEADER.NO_RESULTS' | translate }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500">
                {{ 'COMMON.SEARCH' | translate }} · {{ query() }}
              </p>
            </div>
          }
        </div>
      </div>
    </app-dashboard-layout>
  `
})
export class HelpComponent {
  private translate = inject(TranslateService);

  openKey: string | null = null;
  query = signal('');

  readonly faqs = [
    {
      questionKey: 'HELP.FAQ_Q1',
      answerKey: 'HELP.FAQ_A1',
      icon: '📄',
      categoryKey: 'HELP.CAT_STARTED',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    },
    {
      questionKey: 'HELP.FAQ_Q2',
      answerKey: 'HELP.FAQ_A2',
      icon: '🕐',
      categoryKey: 'HELP.CAT_STARTED',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    },
    {
      questionKey: 'HELP.FAQ_Q3',
      answerKey: 'HELP.FAQ_A3',
      icon: '👥',
      categoryKey: 'HELP.CAT_COLLAB',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      badgeClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
    },
    {
      questionKey: 'HELP.FAQ_Q4',
      answerKey: 'HELP.FAQ_A4',
      icon: '✨',
      categoryKey: 'HELP.CAT_AI',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      badgeClass: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
    },
    {
      questionKey: 'HELP.FAQ_Q5',
      answerKey: 'HELP.FAQ_A5',
      icon: '🔐',
      categoryKey: 'HELP.CAT_STARTED',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    },
    {
      questionKey: 'HELP.FAQ_Q6',
      answerKey: 'HELP.FAQ_A6',
      icon: '📎',
      categoryKey: 'HELP.CAT_AI',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      badgeClass: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
    },
    {
      questionKey: 'HELP.FAQ_Q7',
      answerKey: 'HELP.FAQ_A7',
      icon: '🗑️',
      categoryKey: 'HELP.CAT_STARTED',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    },
    {
      questionKey: 'HELP.FAQ_Q8',
      answerKey: 'HELP.FAQ_A8',
      icon: '📁',
      categoryKey: 'HELP.CAT_STARTED',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    },
    {
      questionKey: 'HELP.FAQ_Q9',
      answerKey: 'HELP.FAQ_A9',
      icon: '👑',
      categoryKey: 'HELP.CAT_COLLAB',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      badgeClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
    },
    {
      questionKey: 'HELP.FAQ_Q10',
      answerKey: 'HELP.FAQ_A10',
      icon: '✉️',
      categoryKey: 'HELP.CAT_COLLAB',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      badgeClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
    },
    {
      questionKey: 'HELP.FAQ_Q11',
      answerKey: 'HELP.FAQ_A11',
      icon: '🔀',
      categoryKey: 'HELP.CAT_STARTED',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    },
    {
      questionKey: 'HELP.FAQ_Q12',
      answerKey: 'HELP.FAQ_A12',
      icon: '💬',
      categoryKey: 'HELP.CAT_COLLAB',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      badgeClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
    },
    {
      questionKey: 'HELP.FAQ_Q13',
      answerKey: 'HELP.FAQ_A13',
      icon: '⚙️',
      categoryKey: 'HELP.CAT_BILLING',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      badgeClass: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
    },
    {
      questionKey: 'HELP.FAQ_Q14',
      answerKey: 'HELP.FAQ_A14',
      icon: '👤',
      categoryKey: 'HELP.CAT_BILLING',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      badgeClass: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
    }
  ];

  get filteredFaqs() {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.faqs;
    return this.faqs.filter(faq => {
      const question = this.translate.instant(faq.questionKey).toLowerCase();
      const answer = this.translate.instant(faq.answerKey).toLowerCase();
      return question.includes(q) || answer.includes(q);
    });
  }

  toggle(key: string): void {
    this.openKey = this.openKey === key ? null : key;
  }

  onSearch(value: string): void {
    this.query.set(value);
    this.openKey = null;
  }
}
