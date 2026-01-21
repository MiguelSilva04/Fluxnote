import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white">
      <app-landing-header></app-landing-header>

      <section class="py-20">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Termos e Condicoes
            </h1>
            <p class="text-xl text-gray-600">
              Ultima atualizacao: 15 de Janeiro de 2025
            </p>
          </div>

          <div class="prose prose-lg max-w-none">
            <div class="bg-green-50 border border-green-200 rounded-2xl p-8 mb-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-4">Bem-vindo ao Fluxnote</h2>
              <p class="text-gray-700">
                Estes termos e condicoes regem a utilizacao do servico Fluxnote.
                Ao utilizar o nosso servico, concorda com estes termos na sua totalidade.
              </p>
            </div>

            <div class="space-y-8">
              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">1. Definicoes</h2>
                <div class="bg-gray-50 rounded-xl p-6">
                  <dl class="space-y-4">
                    <div>
                      <dt class="font-semibold text-gray-900">"Servico"</dt>
                      <dd class="text-gray-700">Refere-se a plataforma Fluxnote e todas as suas funcionalidades</dd>
                    </div>
                    <div>
                      <dt class="font-semibold text-gray-900">"Utilizador"</dt>
                      <dd class="text-gray-700">Qualquer pessoa que acede ou utiliza o Servico</dd>
                    </div>
                    <div>
                      <dt class="font-semibold text-gray-900">"Conteudo"</dt>
                      <dd class="text-gray-700">Documentos, texto, imagens e outros materiais criados no Servico</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">2. Utilizacao do Servico</h2>
                <div class="space-y-4">
                  <div class="bg-green-50 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-3">Utilizacoes Permitidas</h3>
                    <ul class="list-disc list-inside text-gray-700 space-y-2">
                      <li>Criar e editar documentos para fins legitimos</li>
                      <li>Colaborar com outros utilizadores</li>
                      <li>Utilizar as funcionalidades de IA para melhorar o conteudo</li>
                      <li>Partilhar documentos com permissoes apropriadas</li>
                    </ul>
                  </div>

                  <div class="bg-red-50 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-3">Utilizacoes Proibidas</h3>
                    <ul class="list-disc list-inside text-gray-700 space-y-2">
                      <li>Criar conteudo ilegal, difamatorio ou prejudicial</li>
                      <li>Violar direitos de propriedade intelectual</li>
                      <li>Tentar aceder a contas de outros utilizadores</li>
                      <li>Interferir com o funcionamento do Servico</li>
                      <li>Utilizar o Servico para spam ou atividades maliciosas</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">3. Contas de Utilizador</h2>
                <div class="bg-gray-50 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Responsabilidades do Utilizador</h3>
                  <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li>Manter a confidencialidade das credenciais de acesso</li>
                    <li>Fornecer informacoes precisas e atualizadas</li>
                    <li>Notificar-nos imediatamente sobre uso nao autorizado</li>
                    <li>Ser responsavel por toda a atividade na sua conta</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">4. Propriedade Intelectual</h2>
                <div class="grid md:grid-cols-2 gap-6">
                  <div class="bg-blue-50 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-3">O Seu Conteudo</h3>
                    <p class="text-gray-700 mb-3">
                      Mantem todos os direitos sobre o conteudo que cria no Fluxnote.
                    </p>
                    <p class="text-gray-700">
                      Concede-nos apenas uma licenca limitada para processar e armazenar
                      o seu conteudo para fornecer o Servico.
                    </p>
                  </div>

                  <div class="bg-green-50 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-3">Nossa Propriedade</h3>
                    <p class="text-gray-700 mb-3">
                      O Fluxnote, incluindo software, design e funcionalidades,
                      e propriedade nossa e dos nossos licenciadores.
                    </p>
                    <p class="text-gray-700">
                      Nao pode copiar, modificar ou distribuir o nosso software.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">5. Planos e Pagamentos</h2>
                <div class="bg-gray-50 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Subscricoes</h3>
                  <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li>Os planos pagos sao cobrados mensalmente ou anualmente</li>
                    <li>Os precos podem ser alterados com aviso previo de 30 dias</li>
                    <li>Pode cancelar a subscricao a qualquer momento</li>
                    <li>Nao oferecemos reembolsos para periodos parciais</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">6. Limitacao de Responsabilidade</h2>
                <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <p class="text-gray-700 mb-4">
                    O Servico e fornecido "como esta". Nao garantimos que sera sempre
                    disponivel, seguro ou livre de erros.
                  </p>
                  <p class="text-gray-700">
                    A nossa responsabilidade e limitada ao valor pago pelo Servico
                    nos 12 meses anteriores ao incidente.
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">7. Terminacao</h2>
                <div class="bg-gray-50 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Terminacao por Si</h3>
                  <p class="text-gray-700 mb-4">
                    Pode terminar a sua conta a qualquer momento atraves das definicoes
                    da conta ou contactando-nos.
                  </p>

                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Terminacao por Nos</h3>
                  <p class="text-gray-700">
                    Podemos suspender ou terminar a sua conta se violar estes termos
                    ou por outras razoes legitimas, com aviso previo quando possivel.
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">8. Alteracoes aos Termos</h2>
                <div class="bg-green-50 rounded-xl p-6">
                  <p class="text-gray-700 mb-4">
                    Podemos atualizar estes termos ocasionalmente. Notificaremos sobre
                    alteracoes significativas por email ou atraves do Servico.
                  </p>
                  <p class="text-gray-700">
                    A continuacao da utilizacao apos as alteracoes constitui aceitacao
                    dos novos termos.
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">9. Lei Aplicavel</h2>
                <div class="bg-gray-50 rounded-xl p-6">
                  <p class="text-gray-700">
                    Estes termos sao regidos pela lei portuguesa. Qualquer disputa
                    sera resolvida nos tribunais de Lisboa, Portugal.
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">10. Contacto</h2>
                <div class="bg-gray-50 rounded-xl p-6">
                  <p class="text-gray-700 mb-4">
                    Para questoes sobre estes termos, contacte-nos:
                  </p>
                  <div class="space-y-2 text-gray-700">
                    <p><strong>Email:</strong> legal&#64;fluxnote.com</p>
                    <p><strong>Endereco:</strong> Rua da Inovacao, 123, 1000-001 Lisboa, Portugal</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class TermsPageComponent {}
