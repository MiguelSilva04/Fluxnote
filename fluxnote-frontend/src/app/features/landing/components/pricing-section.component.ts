import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-pricing-section',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <section id="precos" class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {{ 'LANDING.PRICING.TITLE' | translate }}
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            {{ 'LANDING.PRICING.SUBTITLE' | translate }}
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          @for (plan of plans; track plan.nameKey) {
            <div
              [class]="'bg-white rounded-2xl p-8 shadow-lg relative flex flex-col ' + (plan.popular ? 'ring-2 ring-[#155347] scale-105' : '')"
            >
              @if (plan.popular) {
                <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span class="bg-[#155347] text-white px-4 py-2 rounded-full text-sm font-semibold">
                    {{ 'LANDING.PRICING.MOST_POPULAR' | translate }}
                  </span>
                </div>
              }

              <div class="text-center mb-8">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ plan.nameKey | translate }}</h3>
                <div class="flex items-baseline justify-center">
                  <span class="text-4xl font-bold text-gray-900">{{ plan.priceKey | translate }}</span>
                  <span class="text-gray-600 ml-1">{{ 'LANDING.PRICING.PER_MONTH' | translate }}</span>
                </div>
              </div>

              <ul class="space-y-4 mb-8 flex-grow">
                @for (featureKey of plan.featureKeys; track featureKey) {
                  <li class="flex items-center">
                    <svg class="w-5 h-5 text-[#155347] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span class="text-gray-700">{{ featureKey | translate }}</span>
                  </li>
                }
              </ul>

              <button
                  [class]="'w-full py-3 px-6 rounded-xl font-semibold transition-colors cursor-pointer ' + (plan.popular ? 'bg-[#155347] text-white hover:bg-[#155347]' : 'border-2 border-[#155347] text-[#155347] hover:bg-[#155347] hover:text-white')"
              >
                {{ 'LANDING.PRICING.CHOOSE_PLAN' | translate }}
              </button>
            </div>
          }
        </div>
      </div>
    </section>
  `
})
export class PricingSectionComponent {
  plans = [
    {
      nameKey: 'LANDING.PRICING.FREE.NAME',
      priceKey: 'LANDING.PRICING.FREE.PRICE',
      featureKeys: [
        'LANDING.PRICING.FREE.F1',
        'LANDING.PRICING.FREE.F2',
        'LANDING.PRICING.FREE.F3',
        'LANDING.PRICING.FREE.F4'
      ],
      popular: false
    },
    {
      nameKey: 'LANDING.PRICING.PRO.NAME',
      priceKey: 'LANDING.PRICING.PRO.PRICE',
      featureKeys: [
        'LANDING.PRICING.PRO.F1',
        'LANDING.PRICING.PRO.F2',
        'LANDING.PRICING.PRO.F3',
        'LANDING.PRICING.PRO.F4',
        'LANDING.PRICING.PRO.F5',
        'LANDING.PRICING.PRO.F6'
      ],
      popular: true
    },
    {
      nameKey: 'LANDING.PRICING.TEAM.NAME',
      priceKey: 'LANDING.PRICING.TEAM.PRICE',
      featureKeys: [
        'LANDING.PRICING.TEAM.F1',
        'LANDING.PRICING.TEAM.F2',
        'LANDING.PRICING.TEAM.F3',
        'LANDING.PRICING.TEAM.F4',
        'LANDING.PRICING.TEAM.F5',
        'LANDING.PRICING.TEAM.F6'
      ],
      popular: false
    }
  ];
}
