import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pricing-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section id="precos" class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Precos Simples e Transparentes
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Escolha o plano que melhor se adapta as suas necessidades. Pode sempre fazer upgrade.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          @for (plan of plans; track plan.name) {
            <div
              [class]="'bg-white rounded-2xl p-8 shadow-lg relative flex flex-col ' + (plan.popular ? 'ring-2 ring-green-500 scale-105' : '')"
            >
              @if (plan.popular) {
                <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span class="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Mais Popular
                  </span>
                </div>
              }

              <div class="text-center mb-8">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ plan.name }}</h3>
                <div class="flex items-baseline justify-center">
                  <span class="text-4xl font-bold text-gray-900">{{ plan.price }}</span>
                  <span class="text-gray-600 ml-1">{{ plan.period }}</span>
                </div>
              </div>

              <ul class="space-y-4 mb-8 flex-grow">
                @for (feature of plan.features; track feature) {
                  <li class="flex items-center">
                    <svg class="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span class="text-gray-700">{{ feature }}</span>
                  </li>
                }
              </ul>

              <button
                [class]="'w-full py-3 px-6 rounded-xl font-semibold transition-colors cursor-pointer ' + (plan.popular ? 'bg-green-600 text-white hover:bg-green-700' : 'border-2 border-green-600 text-green-600 hover:bg-green-50')"
              >
                Escolher plano
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
      name: 'Gratuito',
      price: '0€',
      period: '/mes',
      features: [
        '3 documentos por mes',
        'Colaboracao ate 2 pessoas',
        'Historico basico (7 dias)',
        'Suporte por email'
      ],
      popular: false
    },
    {
      name: 'Pro',
      price: '12€',
      period: '/mes',
      features: [
        'Documentos ilimitados',
        'Colaboracao ate 10 pessoas',
        'Historico completo',
        'IA avancada',
        'Suporte prioritario',
        'Integracoes'
      ],
      popular: true
    },
    {
      name: 'Equipa',
      price: '25€',
      period: '/mes',
      features: [
        'Tudo do Pro',
        'Colaboracao ilimitada',
        'Gestao de equipas',
        'Analytics avancados',
        'SSO e seguranca empresarial',
        'Suporte dedicado'
      ],
      popular: false
    }
  ];
}
