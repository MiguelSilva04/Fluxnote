import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-testimonials-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section id="testemunhos" class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            O que dizem os nossos utilizadores
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Milhares de profissionais ja confiam no Fluxnote para os seus projetos mais importantes.
          </p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          @for (testimonial of testimonials; track testimonial.name) {
            <div class="bg-gray-50 rounded-2xl p-8 shadow-lg">
              <div class="flex items-center mb-6">
                <div class="w-16 h-16 rounded-full overflow-hidden mr-4">
                  <img
                    [src]="testimonial.avatar"
                    [alt]="testimonial.name"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 class="font-semibold text-gray-900">{{ testimonial.name }}</h4>
                  <p class="text-gray-600 text-sm">{{ testimonial.role }}</p>
                </div>
              </div>

              <blockquote class="text-gray-700 italic">
                "{{ testimonial.quote }}"
              </blockquote>

              <div class="flex text-green-500 mt-4">
                @for (star of [1,2,3,4,5]; track star) {
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `
})
export class TestimonialsSectionComponent {
  testimonials = [
    {
      name: 'Ana Silva',
      role: 'Gestora de Projetos',
      quote: 'O Fluxnote revolucionou a forma como a nossa equipe colabora. A IA realmente ajuda a melhorar a qualidade dos nossos documentos.',
      avatar: 'assets/ana.jpeg'
    },
    {
      name: 'Joao Santos',
      role: 'Diretor de Marketing',
      quote: 'Nunca foi tao facil criar conteudo de qualidade. A colaboracao em tempo real e perfeita para as nossas campanhas.',
      avatar: 'assets/joao.jpg'
    },
    {
      name: 'Maria Costa',
      role: 'Consultora',
      quote: 'A funcionalidade de historico de versoes salvou-me varias vezes. E uma ferramenta indispensavel para qualquer profissional.',
      avatar: 'assets/maria.jpg'
    }
  ];
}
