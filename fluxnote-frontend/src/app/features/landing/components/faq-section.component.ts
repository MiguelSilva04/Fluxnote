import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-faq-section',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <section id="faq" class="py-20 bg-white dark:bg-gray-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {{ 'LANDING.FAQ.TITLE' | translate }}
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            {{ 'LANDING.FAQ.SUBTITLE' | translate }}
          </p>
        </div>

        <div class="space-y-4">
          @for (faq of faqs; track faq.questionKey; let i = $index) {
            <div class="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <button
                (click)="toggleFaq(i)"
                class="w-full px-6 py-6 text-left flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-4">
                  {{ faq.questionKey | translate }}
                </h3>
                <div class="flex-shrink-0">
                  <svg
                    [class]="'w-6 h-6 text-[#155347] dark:text-emerald-400 transform transition-transform ' + (openIndex() === i ? 'rotate-180' : '')"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              @if (openIndex() === i) {
                <div class="px-6 pb-6">
                  <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {{ faq.answerKey | translate }}
                    </p>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="text-center mt-12">
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {{ 'LANDING.FAQ.NOT_FOUND' | translate }}
          </p>
          <button
            (click)="goToContact()"
            class="bg-[#155347] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#155347] transition-colors shadow-lg cursor-pointer"
          >
            {{ 'LANDING.FAQ.CONTACT_SUPPORT' | translate }}
          </button>
        </div>
      </div>
    </section>
  `
})
export class FaqSectionComponent {
  openIndex = signal<number | null>(null);

  faqs = [
    { questionKey: 'LANDING.FAQ.Q1', answerKey: 'LANDING.FAQ.A1' },
    { questionKey: 'LANDING.FAQ.Q2', answerKey: 'LANDING.FAQ.A2' },
    { questionKey: 'LANDING.FAQ.Q3', answerKey: 'LANDING.FAQ.A3' },
    { questionKey: 'LANDING.FAQ.Q4', answerKey: 'LANDING.FAQ.A4' },
    { questionKey: 'LANDING.FAQ.Q5', answerKey: 'LANDING.FAQ.A5' },
    { questionKey: 'LANDING.FAQ.Q6', answerKey: 'LANDING.FAQ.A6' },
    { questionKey: 'LANDING.FAQ.Q7', answerKey: 'LANDING.FAQ.A7' }
  ];

  constructor(private router: Router) {}

  toggleFaq(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }

  goToContact(): void {
    this.router.navigate(['/contact']);
  }
}
