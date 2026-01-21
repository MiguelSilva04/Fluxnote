import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [CommonModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white">
      <app-landing-header></app-landing-header>

      <section class="bg-gradient-to-br from-green-50 to-white py-20 lg:py-32">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Veja como o Fluxnote funciona na pratica
            </h1>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Assista a uma demonstracao interativa da criacao de documentos com ajuda de IA e colaboracao em tempo real.
            </p>
          </div>

          <div class="max-w-4xl mx-auto mb-12">
            <div class="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div class="relative">
                <img
                  src="assets/videoBackground.jpg"
                  alt="Demonstracao do Fluxnote - Colaboracao com IA"
                  class="w-full h-96 lg:h-[500px] object-cover"
                />
                <div class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <button class="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-6 transition-all transform hover:scale-105 shadow-lg cursor-pointer">
                    <svg class="w-12 h-12 text-green-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="text-center">
            <button (click)="goToRegister()" class="bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg cursor-pointer">
              Criar Conta e experimentar
            </button>
          </div>
        </div>
      </section>

      <!-- Interactive Steps Section -->
      <section class="py-20 bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Como funciona em 4 passos simples
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Descubra como e facil criar documentos profissionais com a ajuda da inteligencia artificial.
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            @for (step of steps; track step.title; let i = $index) {
              <div class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center relative">
                <div class="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full text-green-600 mb-6" [innerHTML]="step.icon"></div>
                <div class="absolute top-4 left-4 bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  {{ i + 1 }}
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-4">
                  {{ step.title }}
                </h3>
                <p class="text-gray-600">
                  {{ step.description }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Testimonial Section -->
      <section class="py-20 bg-green-50">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div class="bg-white rounded-2xl p-12 shadow-lg">
            <div class="mb-8">
              <svg class="w-12 h-12 text-green-600 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
              </svg>
            </div>
            <blockquote class="text-2xl text-gray-900 font-medium mb-8">
              "Ver a demonstracao convenceu toda a minha equipa - agora usamos Fluxnote todos os dias!"
            </blockquote>
            <div class="flex items-center justify-center">
              <div class="w-12 h-12 rounded-full overflow-hidden mr-4">
                <img
                  src="assets/sofia.jpg"
                  alt="Sofia Mendes"
                  class="w-full h-full object-cover"
                />
              </div>
              <div class="text-left">
                <div class="font-semibold text-gray-900">Sofia Mendes</div>
                <div class="text-gray-600">Gestora de Projetos, TechFlow</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Final Call to Action -->
      <section class="py-20 bg-gray-900 text-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl lg:text-4xl font-bold mb-6">
            Pronto para experimentar o Fluxnote?
          </h2>
          <p class="text-xl text-gray-300 mb-8">
            Sem cartao de credito. Comece em menos de 1 minuto.
          </p>
          <button (click)="goToRegister()" class="bg-green-600 text-white px-12 py-4 rounded-xl text-xl font-semibold hover:bg-green-700 transition-colors shadow-lg cursor-pointer">
            Criar Conta Gratuitamente
          </button>
          <p class="text-gray-400 mt-4">
            Junte-se a milhares de profissionais que ja confiam no Fluxnote
          </p>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class DemoPageComponent {
  steps = [
    {
      icon: `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>`,
      title: 'Criar novo documento',
      description: 'Comece um novo documento em segundos com templates inteligentes ou uma pagina em branco.'
    },
    {
      icon: `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>`,
      title: 'Convidar colegas',
      description: 'Adicione membros da equipa com um clique e defina permissoes de edicao personalizadas.'
    },
    {
      icon: `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>`,
      title: 'Receber sugestoes de IA',
      description: 'A inteligencia artificial oferece melhorias de texto, correcoes e sugestoes de conteudo em tempo real.'
    },
    {
      icon: `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`,
      title: 'Voltar a versoes anteriores',
      description: 'Aceda ao historico completo de alteracoes e restaure qualquer versao anterior com facilidade.'
    }
  ];

  constructor(private router: Router) {}

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
