import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-faq-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section id="faq" class="py-20 bg-white">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Perguntas Frequentes
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Encontre respostas as perguntas mais comuns sobre o Fluxnote e as suas funcionalidades.
          </p>
        </div>

        <div class="space-y-4">
          @for (faq of faqs; track faq.question; let i = $index) {
            <div class="bg-gray-50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <button
                (click)="toggleFaq(i)"
                class="w-full px-6 py-6 text-left flex justify-between items-center hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 class="text-lg font-semibold text-gray-900 pr-4">
                  {{ faq.question }}
                </h3>
                <div class="flex-shrink-0">
                  <svg
                    [class]="'w-6 h-6 text-green-600 transform transition-transform ' + (openIndex() === i ? 'rotate-180' : '')"
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
                  <div class="border-t border-gray-200 pt-4">
                    <p class="text-gray-700 leading-relaxed">
                      {{ faq.answer }}
                    </p>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="text-center mt-12">
          <p class="text-gray-600 mb-4">
            Nao encontrou a resposta que procurava?
          </p>
          <button
            (click)="goToContact()"
            class="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg cursor-pointer"
          >
            Contactar Suporte
          </button>
        </div>
      </div>
    </section>
  `
})
export class FaqSectionComponent {
  openIndex = signal<number | null>(null);

  faqs = [
    {
      question: 'Como funciona a inteligencia artificial no Fluxnote?',
      answer: 'A IA do Fluxnote ajuda na criacao de conteudo, correcao gramatical, sugestoes de melhoria e formatacao automatica. Ela aprende com o seu estilo de escrita e oferece sugestoes personalizadas para tornar os seus documentos mais eficazes.'
    },
    {
      question: 'Quantas pessoas podem colaborar simultaneamente num documento?',
      answer: 'O numero de colaboradores varia conforme o plano: o plano Gratuito permite ate 2 pessoas, o Pro ate 10 pessoas, e o plano Equipa oferece colaboracao ilimitada. Todas as alteracoes sao sincronizadas em tempo real.'
    },
    {
      question: 'Os meus dados estao seguros no Fluxnote?',
      answer: 'Sim, a seguranca e a nossa prioridade. Utilizamos encriptacao de ponta a ponta, armazenamento seguro na cloud, e cumprimos com as regulamentacoes GDPR. Os seus documentos sao privados e apenas acessiveis por si e pelas pessoas que autorizar.'
    },
    {
      question: 'Posso usar o Fluxnote offline?',
      answer: 'O Fluxnote funciona principalmente online para garantir a sincronizacao em tempo real. No entanto, oferecemos funcionalidade offline limitada que permite visualizar e editar documentos recentes, com sincronizacao automatica quando voltar a estar online.'
    },
    {
      question: 'Como funciona o historico de versoes?',
      answer: 'Cada alteracao no documento e automaticamente guardada. Pode ver todas as versoes anteriores, comparar mudancas, e restaurar qualquer versao anterior. O plano Gratuito mantem 7 dias de historico, enquanto os planos pagos oferecem historico completo.'
    },
    {
      question: 'Posso importar documentos de outras plataformas?',
      answer: 'Sim, o Fluxnote suporta importacao de documentos do Microsoft Word, Google Docs, PDF e outros formatos populares. A formatacao e preservada e pode comecar a colaborar imediatamente apos a importacao.'
    },
    {
      question: 'Como posso cancelar a minha subscricao?',
      answer: 'Pode cancelar a sua subscricao a qualquer momento nas definicoes da conta. O acesso as funcionalidades premium mantem-se ate ao final do periodo pago, e pode sempre voltar a subscrever quando desejar.'
    },
    {
      question: 'Existe uma versao movel do Fluxnote?',
      answer: 'Sim, o Fluxnote e totalmente responsivo e funciona perfeitamente em dispositivos moveis atraves do navegador. Tambem temos aplicacoes nativas para iOS e Android em desenvolvimento, que estarao disponiveis em breve.'
    },
    {
      question: 'Que tipos de documentos posso criar?',
      answer: 'O Fluxnote e versatil e permite criar relatorios, propostas, artigos, apresentacoes, manuais, contratos, e qualquer tipo de documento de texto. A IA adapta-se ao tipo de conteudo que esta a criar.'
    },
    {
      question: 'Como funciona o suporte tecnico?',
      answer: 'Oferecemos suporte por email para todos os utilizadores, suporte prioritario para utilizadores Pro, e suporte dedicado para equipas. Tambem temos uma base de conhecimento completa e tutoriais em video disponiveis.'
    }
  ];

  constructor(private router: Router) {}

  toggleFaq(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }

  goToContact(): void {
    this.router.navigate(['/contact']);
  }
}
