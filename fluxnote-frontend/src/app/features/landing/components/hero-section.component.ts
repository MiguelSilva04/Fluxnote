import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="bg-gradient-to-br from-green-50 to-white py-20 lg:py-32 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div class="text-center lg:text-left">
            <h1 class="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Crie documentos com a ajuda de
              <span class="text-green-600"> IA</span> e
              <span class="text-green-600"> colaboracao em tempo real</span>
            </h1>

            <p class="text-xl text-gray-600 mb-8 max-w-2xl">
              Transforme a forma como voce e sua equipe criam documentos. Com
              inteligencia artificial integrada e colaboracao instantanea, nunca
              foi tao facil produzir conteudo de qualidade.
            </p>

            <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                (click)="goToLogin()"
                class="bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg cursor-pointer"
              >
                Comecar
              </button>
              <button
                (click)="goToDemo()"
                class="border-2 border-green-600 text-green-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-green-50 transition-colors cursor-pointer"
              >
                Ver demonstracao
              </button>
            </div>
          </div>

          <div class="relative">
            <div class="bg-white rounded-2xl shadow-2xl p-8">
              <img
                src="assets/mainPageImage.png"
                alt="Duas pessoas colaborando numa interface digital com sugestoes de IA"
                class="w-full h-96 object-cover rounded-lg"
              />
            </div>

            <!-- Floating elements -->
            <div class="absolute -top-4 -right-4 bg-green-100 rounded-xl p-4 shadow-lg">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                <span class="text-sm font-medium text-gray-700">
                  IA Ativa
                </span>
              </div>
            </div>

            <div class="absolute -bottom-4 -left-4 bg-blue-100 rounded-xl p-4 shadow-lg">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span class="text-sm font-medium text-gray-700">
                  3 colaboradores
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HeroSectionComponent {
  constructor(private router: Router) {}

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToDemo(): void {
    this.router.navigate(['/demo']);
  }
}
