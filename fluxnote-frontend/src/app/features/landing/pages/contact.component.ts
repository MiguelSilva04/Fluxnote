import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white">
      <app-landing-header></app-landing-header>

      <section class="py-20 bg-gradient-to-br from-green-50 to-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Entre em Contacto
            </h1>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Tem alguma questao, sugestao ou precisa de ajuda? Estamos aqui para si.
              Entre em contacto atraves de qualquer um dos metodos abaixo.
            </p>
          </div>

          <div class="grid lg:grid-cols-2 gap-12">
            <!-- Contact Form -->
            <div class="bg-white rounded-2xl shadow-lg p-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-6">Envie-nos uma Mensagem</h2>

              @if (submitStatus() === 'success') {
                <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p class="text-green-800 font-medium">
                    Mensagem enviada com sucesso! Responderemos em breve.
                  </p>
                </div>
              }

              @if (submitStatus() === 'error') {
                <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p class="text-red-800">
                    Ocorreu um erro ao enviar a mensagem. Tente novamente.
                  </p>
                </div>
              }

              <form (submit)="handleSubmit($event)" class="space-y-6">
                <div class="grid md:grid-cols-2 gap-6">
                  <div>
                    <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo
                    </label>
                    <input
                      id="name"
                      type="text"
                      [(ngModel)]="formData.name"
                      name="name"
                      class="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>

                  <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      [(ngModel)]="formData.email"
                      name="email"
                      class="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label for="subject" class="block text-sm font-medium text-gray-700 mb-2">
                    Assunto
                  </label>
                  <select
                    id="subject"
                    [(ngModel)]="formData.subject"
                    name="subject"
                    class="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Selecione um assunto</option>
                    <option value="suporte">Suporte Tecnico</option>
                    <option value="vendas">Questoes de Vendas</option>
                    <option value="feedback">Feedback do Produto</option>
                    <option value="parceria">Oportunidades de Parceria</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label for="message" class="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    id="message"
                    rows="6"
                    [(ngModel)]="formData.message"
                    name="message"
                    class="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Descreva a sua questao ou mensagem..."
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  [disabled]="isSubmitting()"
                  class="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  @if (isSubmitting()) {
                    <div class="flex items-center justify-center">
                      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </div>
                  } @else {
                    Enviar Mensagem
                  }
                </button>
              </form>
            </div>

            <!-- Contact Methods -->
            <div class="space-y-8">
              <div>
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Outras Formas de Contacto</h2>
                <div class="space-y-6">
                  @for (method of contactMethods; track method.title) {
                    <div class="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                      <div class="flex items-start">
                        <div class="text-3xl mr-4">{{ method.icon }}</div>
                        <div class="flex-1">
                          <h3 class="text-lg font-semibold text-gray-900 mb-2">
                            {{ method.title }}
                          </h3>
                          <p class="text-gray-600 mb-3">
                            {{ method.description }}
                          </p>
                          <p class="text-green-600 font-medium mb-3">
                            {{ method.contact }}
                          </p>
                          <button class="text-green-600 font-semibold hover:text-green-700 transition-colors cursor-pointer">
                            {{ method.action }} →
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Office Info -->
              <div class="bg-gray-50 rounded-2xl p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Escritorio</h3>
                <div class="space-y-2 text-gray-700">
                  <p><strong>Endereco:</strong></p>
                  <p>Rua da Inovacao, 123</p>
                  <p>1000-001 Lisboa, Portugal</p>
                  <p class="mt-3"><strong>Horario:</strong></p>
                  <p>Segunda a Sexta: 9h00 - 18h00</p>
                  <p>Sabado: 10h00 - 14h00</p>
                </div>
              </div>

              <!-- FAQ Link -->
              <div class="bg-green-50 rounded-2xl p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">
                  Antes de nos contactar
                </h3>
                <p class="text-gray-700 mb-4">
                  Consulte as nossas perguntas frequentes - pode encontrar a resposta
                  que procura mais rapidamente.
                </p>
                <button class="text-green-600 font-semibold hover:text-green-700 transition-colors">
                  Ver FAQ →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class ContactPageComponent {
  formData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  isSubmitting = signal(false);
  submitStatus = signal<'idle' | 'success' | 'error'>('idle');

  contactMethods = [
    {
      icon: '📧',
      title: 'Email',
      description: 'Envie-nos um email e responderemos em 24 horas',
      contact: 'suporte@fluxnote.com',
      action: 'Enviar Email'
    },
    {
      icon: '💬',
      title: 'Chat ao Vivo',
      description: 'Fale connosco em tempo real durante o horario comercial',
      contact: 'Segunda a Sexta, 9h-18h',
      action: 'Iniciar Chat'
    },
    {
      icon: '📞',
      title: 'Telefone',
      description: 'Ligue-nos para suporte imediato',
      contact: '+351 21 123 4567',
      action: 'Ligar Agora'
    }
  ];

  async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.isSubmitting.set(true);
    this.submitStatus.set('idle');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.submitStatus.set('success');
      this.formData = { name: '', email: '', subject: '', message: '' };
    } catch {
      this.submitStatus.set('error');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
