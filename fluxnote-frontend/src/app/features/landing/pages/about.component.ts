import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white">
      <app-landing-header></app-landing-header>

      <section class="py-20 bg-gradient-to-br from-green-50 to-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Sobre a Fluxnote
            </h1>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Somos uma equipa apaixonada por tecnologia e colaboracao, dedicada a
              revolucionar a forma como as pessoas criam e partilham conhecimento.
            </p>
          </div>

          <div class="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 class="text-3xl font-bold text-gray-900 mb-6">A Nossa Missao</h2>
              <p class="text-gray-700 mb-6 text-lg">
                Democratizar o acesso a ferramentas de colaboracao inteligentes,
                permitindo que equipas de todos os tamanhos criem documentos de
                qualidade profissional com a ajuda da inteligencia artificial.
              </p>
              <p class="text-gray-700 text-lg">
                Acreditamos que quando as pessoas tem as ferramentas certas,
                podem focar-se no que realmente importa: as suas ideias e a sua criatividade.
              </p>
            </div>
            <div class="bg-white rounded-2xl shadow-lg p-4">
              <img
                src="assets/ourMission.png"
                alt="Equipa Fluxnote a trabalhar"
                class="w-full h-64 object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Os Nossos Valores
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Estes valores guiam tudo o que fazemos, desde o desenvolvimento do produto
              ate ao atendimento ao cliente.
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            @for (value of values; track value.title) {
              <div class="text-center">
                <div class="text-4xl mb-4">{{ value.icon }}</div>
                <h3 class="text-xl font-semibold text-gray-900 mb-3">
                  {{ value.title }}
                </h3>
                <p class="text-gray-600">
                  {{ value.description }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="py-20 bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Conheca a Nossa Equipa
            </h2>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Profissionais talentosos e dedicados que trabalham todos os dias
              para tornar o Fluxnote melhor.
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            @for (member of teamMembers; track member.name) {
              <div class="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div class="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4">
                  <img
                    [src]="member.image"
                    [alt]="member.name"
                    class="w-full h-full object-cover"
                  />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">
                  {{ member.name }}
                </h3>
                <p class="text-green-600 font-medium mb-3">
                  {{ member.role }}
                </p>
                <p class="text-gray-600 text-sm">
                  {{ member.description }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="py-20 bg-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              A Nossa Jornada
            </h2>
            <p class="text-xl text-gray-600">
              Desde a ideia inicial ate hoje, veja como o Fluxnote evoluiu.
            </p>
          </div>

          <div class="relative">
            <div class="absolute left-8 top-0 bottom-0 w-0.5 bg-green-300"></div>

            <div class="space-y-12">
              @for (milestone of milestones; track milestone.year) {
                <div class="relative flex items-start">
                  <div class="absolute left-6 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
                  <div class="ml-16 bg-gray-50 rounded-2xl p-6">
                    <div class="flex items-center mb-3">
                      <span class="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                        {{ milestone.year }}
                      </span>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-2">
                      {{ milestone.title }}
                    </h3>
                    <p class="text-gray-700">
                      {{ milestone.description }}
                    </p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <section class="py-20 bg-green-600 text-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl lg:text-4xl font-bold mb-6">
            Junte-se a Nossa Missao
          </h2>
          <p class="text-xl mb-8 opacity-90">
            Quer fazer parte da revolucao na colaboracao digital?
            Estamos sempre a procura de talentos excepcionais.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button class="border-2 bg-white text-green-600 px-8 py-3 rounded-xl font-semibold hover:bg-green-600 hover:text-white hover:border-2 border-white transition-colors cursor-pointer">
              Ver Oportunidades
            </button>
            <button class="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white hover:text-green-600 transition-colors cursor-pointer">
              Contactar-nos
            </button>
          </div>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class AboutPageComponent {
  teamMembers = [
    {
      name: 'Miguel Silva',
      role: 'CEO & Fundador',
      description: 'Engenheiro de software com expertise em IA e sistemas distribuidos.',
      image: 'assets/miguelsilva.png'
    },
    {
      name: 'Ana Rodrigues',
      role: 'Estagiaria',
      description: 'Especialista em gestao de produto com 10 anos de experiencia em tecnologia.',
      image: 'assets/anaRodriges.jpg'
    },
    {
      name: 'Sofia Mendes',
      role: 'Estagiaria',
      description: 'Designer UX/UI apaixonada por criar experiencias intuitivas e acessiveis.',
      image: 'assets/sofiaMendes.jpg'
    },
    {
      name: 'Joao Ferreira',
      role: 'Estagiario',
      description: 'Desenvolvedor full-stack com foco em performance e escalabilidade.',
      image: 'assets/joaoFerreira.jpg'
    }
  ];

  values = [
    {
      icon: '🚀',
      title: 'Inovacao',
      description: 'Estamos sempre a explorar novas tecnologias para melhorar a experiencia dos nossos utilizadores.'
    },
    {
      icon: '🤝',
      title: 'Colaboracao',
      description: 'Acreditamos que as melhores ideias surgem quando as pessoas trabalham em conjunto.'
    },
    {
      icon: '🔒',
      title: 'Transparencia',
      description: 'Somos abertos sobre como funcionamos e como protegemos os seus dados.'
    },
    {
      icon: '🎯',
      title: 'Foco no Utilizador',
      description: 'Todas as nossas decisoes sao tomadas pensando na melhor experiencia para si.'
    }
  ];

  milestones = [
    {
      year: '2023',
      title: 'Fundacao da Fluxnote',
      description: 'Inicio do desenvolvimento da plataforma com foco em colaboracao e IA.'
    },
    {
      year: '2024',
      title: 'Lancamento Beta',
      description: 'Primeira versao disponivel para utilizadores selecionados.'
    },
    {
      year: '2025',
      title: 'Lancamento Publico',
      description: 'Abertura da plataforma ao publico geral com funcionalidades completas.'
    }
  ];
}
