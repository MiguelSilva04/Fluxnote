import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white">
      <app-landing-header></app-landing-header>

      <section class="py-20">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Politica de Privacidade
            </h1>
            <p class="text-xl text-gray-600">
              Ultima atualizacao: 15 de Janeiro de 2025
            </p>
          </div>

          <div class="prose prose-lg max-w-none">
            <div class="bg-green-50 border border-green-200 rounded-2xl p-8 mb-8">
              <h2 class="text-2xl font-bold text-gray-900 mb-4">Resumo da Nossa Politica</h2>
              <p class="text-gray-700">
                No Fluxnote, a sua privacidade e fundamental. Recolhemos apenas os dados necessarios
                para fornecer o nosso servico, nunca vendemos as suas informacoes a terceiros,
                e damos-lhe controlo total sobre os seus dados.
              </p>
            </div>

            <div class="space-y-8">
              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">1. Informacoes que Recolhemos</h2>
                <div class="bg-gray-50 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Informacoes de Conta</h3>
                  <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li>Nome completo e endereco de email</li>
                    <li>Palavra-passe (encriptada)</li>
                    <li>Informacoes de perfil opcionais</li>
                  </ul>
                </div>

                <div class="bg-gray-50 rounded-xl p-6 mt-4">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Conteudo e Documentos</h3>
                  <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li>Documentos criados e editados na plataforma</li>
                    <li>Comentarios e sugestoes</li>
                    <li>Historico de versoes dos documentos</li>
                  </ul>
                </div>

                <div class="bg-gray-50 rounded-xl p-6 mt-4">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Dados de Utilizacao</h3>
                  <ul class="list-disc list-inside text-gray-700 space-y-2">
                    <li>Informacoes sobre como utiliza o servico</li>
                    <li>Dados de performance e diagnostico</li>
                    <li>Endereco IP e informacoes do dispositivo</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">2. Como Utilizamos as Suas Informacoes</h2>
                <div class="grid md:grid-cols-2 gap-6">
                  <div class="bg-green-50 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-3">Fornecimento do Servico</h3>
                    <ul class="list-disc list-inside text-gray-700 space-y-2">
                      <li>Criar e manter a sua conta</li>
                      <li>Processar e armazenar documentos</li>
                      <li>Facilitar a colaboracao em tempo real</li>
                    </ul>
                  </div>

                  <div class="bg-blue-50 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-3">Melhoramento do Produto</h3>
                    <ul class="list-disc list-inside text-gray-700 space-y-2">
                      <li>Analisar padroes de utilizacao</li>
                      <li>Desenvolver novas funcionalidades</li>
                      <li>Melhorar a performance da IA</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">3. Partilha de Informacoes</h2>
                <div class="bg-red-50 border border-red-200 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 mb-3">Nunca Vendemos os Seus Dados</h3>
                  <p class="text-gray-700 mb-4">
                    O Fluxnote nunca vende, aluga ou comercializa as suas informacoes pessoais a terceiros.
                  </p>
                  <p class="text-gray-700">
                    Apenas partilhamos informacoes em circunstancias muito especificas:
                  </p>
                  <ul class="list-disc list-inside text-gray-700 mt-3 space-y-1">
                    <li>Com o seu consentimento explicito</li>
                    <li>Para cumprir obrigacoes legais</li>
                    <li>Com fornecedores de servicos essenciais (sob contrato de confidencialidade)</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">4. Seguranca dos Dados</h2>
                <div class="grid md:grid-cols-3 gap-6">
                  <div class="bg-gray-50 rounded-xl p-6 text-center">
                    <div class="text-3xl mb-3">🔒</div>
                    <h3 class="font-semibold text-gray-900 mb-2">Encriptacao</h3>
                    <p class="text-gray-700 text-sm">Todos os dados sao encriptados em transito e em repouso</p>
                  </div>

                  <div class="bg-gray-50 rounded-xl p-6 text-center">
                    <div class="text-3xl mb-3">🛡️</div>
                    <h3 class="font-semibold text-gray-900 mb-2">Acesso Controlado</h3>
                    <p class="text-gray-700 text-sm">Acesso limitado apenas a pessoal autorizado</p>
                  </div>

                  <div class="bg-gray-50 rounded-xl p-6 text-center">
                    <div class="text-3xl mb-3">🔍</div>
                    <h3 class="font-semibold text-gray-900 mb-2">Monitorizacao</h3>
                    <p class="text-gray-700 text-sm">Monitorizacao continua de seguranca</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">5. Os Seus Direitos</h2>
                <div class="bg-green-50 rounded-xl p-6">
                  <p class="text-gray-700 mb-4">
                    De acordo com o GDPR e outras leis de protecao de dados, tem os seguintes direitos:
                  </p>
                  <div class="grid md:grid-cols-2 gap-4">
                    <ul class="list-disc list-inside text-gray-700 space-y-2">
                      <li>Acesso aos seus dados pessoais</li>
                      <li>Correcao de informacoes incorretas</li>
                      <li>Eliminacao dos seus dados</li>
                    </ul>
                    <ul class="list-disc list-inside text-gray-700 space-y-2">
                      <li>Portabilidade dos dados</li>
                      <li>Restricao do processamento</li>
                      <li>Oposicao ao processamento</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 mb-4">6. Contacto</h2>
                <div class="bg-gray-50 rounded-xl p-6">
                  <p class="text-gray-700 mb-4">
                    Para questoes sobre privacidade ou para exercer os seus direitos, contacte-nos:
                  </p>
                  <div class="space-y-2 text-gray-700">
                    <p><strong>Email:</strong> privacy&#64;fluxnote.com</p>
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
export class PrivacyPageComponent {}
