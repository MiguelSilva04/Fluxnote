import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-technologies',
  standalone: true,
  imports: [CommonModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white">
      <app-landing-header></app-landing-header>

      <section class="py-20 bg-gradient-to-br from-green-50 to-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Tecnologias Utilizadas
            </h1>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              O Fluxnote e construido com as mais modernas tecnologias para
              garantir performance, escalabilidade e uma experiencia de
              utilizador excepcional.
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (category of techCategories; track category.title) {
              <div class="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div class="flex items-center mb-6">
                  <span class="text-4xl mr-4">{{ category.icon }}</span>
                  <h2 class="text-2xl font-bold text-gray-900">
                    {{ category.title }}
                  </h2>
                </div>

                <div class="space-y-4">
                  @for (tech of category.technologies; track tech.name) {
                    <div class="border-l-4 border-green-500 pl-4">
                      <h3 class="font-semibold text-gray-900 mb-1">
                        {{ tech.name }}
                      </h3>
                      <p class="text-gray-600 text-sm">
                        {{ tech.description }}
                      </p>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <div class="mt-16 bg-gray-50 rounded-2xl p-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">
              Arquitetura Tecnica
            </h2>
            <div class="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div class="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">🌐</span>
                </div>
                <h3 class="font-semibold text-gray-900 mb-2">
                  Frontend Moderno
                </h3>
                <p class="text-gray-600 text-sm">
                  Interface responsiva construida com React e TailwindCSS para
                  uma experiencia fluida
                </p>
              </div>
              <div>
                <div class="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">⚡</span>
                </div>
                <h3 class="font-semibold text-gray-900 mb-2">
                  Backend Escalavel
                </h3>
                <p class="text-gray-600 text-sm">
                  API robusta com Node.js e Express, suportada por PostgreSQL
                  para dados seguros
                </p>
              </div>
              <div>
                <div class="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">🚀</span>
                </div>
                <h3 class="font-semibold text-gray-900 mb-2">
                  Deploy Automatizado
                </h3>
                <p class="text-gray-600 text-sm">
                  Infraestrutura containerizada com Docker e Kubernetes para
                  alta disponibilidade
                </p>
              </div>
            </div>
            <div class="text-center mt-8">
              <button
                (click)="goBack()"
                class="bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class TechnologiesPageComponent {
  techCategories = [
    {
      title: 'Frontend',
      icon: '🎨',
      technologies: [
        { name: 'React', description: 'Biblioteca JavaScript para construcao de interfaces de utilizador' },
        { name: 'TipTap', description: 'Editor de texto rico e extensivel para aplicacoes web' },
        { name: 'TailwindCSS', description: 'Framework CSS utilitario para design rapido e responsivo' }
      ]
    },
    {
      title: 'Backend',
      icon: '⚙️',
      technologies: [
        { name: 'Node.js', description: 'Runtime JavaScript para desenvolvimento server-side' },
        { name: 'Express', description: 'Framework web minimalista e flexivel para Node.js' }
      ]
    },
    {
      title: 'Sincronizacao',
      icon: '🔄',
      technologies: [
        { name: 'Yjs', description: 'Framework para colaboracao em tempo real e sincronizacao de dados' },
        { name: 'WebSockets', description: 'Protocolo de comunicacao bidirecional em tempo real' }
      ]
    },
    {
      title: 'Base de Dados',
      icon: '🗄️',
      technologies: [
        { name: 'PostgreSQL', description: 'Sistema de gestao de base de dados relacional avancado' },
        { name: 'Firebase', description: 'Plataforma para autenticacao e notificacoes push' }
      ]
    },
    {
      title: 'AI Agents',
      icon: '🤖',
      technologies: [
        { name: 'OpenAI API', description: 'API de inteligencia artificial para processamento de linguagem natural' }
      ]
    },
    {
      title: 'Infraestrutura',
      icon: '☁️',
      technologies: [
        { name: 'Docker', description: 'Plataforma de containerizacao para deployment consistente' },
        { name: 'Kubernetes', description: 'Sistema de orquestracao de containers para escalabilidade' },
        { name: 'GitHub Actions', description: 'Plataforma de CI/CD para automacao de workflows' }
      ]
    }
  ];

  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/']);
  }
}
