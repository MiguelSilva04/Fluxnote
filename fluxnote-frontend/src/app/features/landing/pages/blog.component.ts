import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white">
      <app-landing-header></app-landing-header>

      <section class="py-20 bg-gradient-to-br from-green-50 to-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Blog Fluxnote
            </h1>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Insights, dicas e novidades sobre colaboracao, inteligencia
              artificial e produtividade no trabalho moderno.
            </p>
          </div>

          <!-- Category Filter -->
          <div class="flex flex-wrap justify-center gap-4 mb-12">
            @for (category of categories; track category) {
              <button
                (click)="selectCategory(category)"
                [class]="'px-6 py-2 rounded-full font-medium transition-colors cursor-pointer ' + (selectedCategory() === category ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-green-50 hover:text-green-600 border border-gray-200')"
              >
                {{ category }}
              </button>
            }
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (post of filteredPosts(); track post.title) {
              <article class="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <div class="relative">
                  <img
                    [src]="post.image"
                    [alt]="post.title"
                    class="w-full h-48 object-cover"
                  />
                  <div class="absolute top-4 left-4">
                    <span class="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {{ post.category }}
                    </span>
                  </div>
                </div>

                <div class="p-6">
                  <div class="flex items-center text-sm text-gray-500 mb-3">
                    <span>{{ post.date }}</span>
                    <span class="mx-2">•</span>
                    <span>{{ post.readTime }} de leitura</span>
                  </div>

                  <h2 class="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {{ post.title }}
                  </h2>

                  <p class="text-gray-600 mb-4 line-clamp-3">
                    {{ post.excerpt }}
                  </p>

                  <button class="text-green-600 font-semibold hover:text-green-700 transition-colors cursor-pointer">
                    Ler mais →
                  </button>
                </div>
              </article>
            }
          </div>

          <div class="mt-16 bg-gray-50 rounded-2xl p-8 text-center">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">
              Nao perca nenhum artigo
            </h2>
            <p class="text-black mb-6">
              Subscreva a nossa newsletter e receba os melhores artigos sobre
              produtividade e colaboracao.
            </p>
            <div class="max-w-md mx-auto flex">
              <input
                type="email"
                placeholder="O seu email"
                class="flex-1 px-4 py-3 border text-black border-gray-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button class="bg-green-600 text-white px-6 py-3 rounded-r-xl font-semibold hover:bg-green-700 transition-colors cursor-pointer">
                Subscrever
              </button>
            </div>
          </div>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class BlogPageComponent {
  blogPosts = [
    {
      title: 'O Futuro da Colaboracao: Como a IA esta a Transformar o Trabalho em Equipa',
      excerpt: 'Descubra como a inteligencia artificial esta a revolucionar a forma como as equipas colaboram e criam conteudo em conjunto.',
      date: '15 Janeiro 2025',
      readTime: '5 min',
      category: 'IA & Colaboracao',
      image: 'https://via.placeholder.com/400x250/22c55e/ffffff?text=IA+Colaboracao'
    },
    {
      title: '10 Dicas para Maximizar a Produtividade na Criacao de Documentos',
      excerpt: 'Estrategias praticas para otimizar o seu fluxo de trabalho e criar documentos mais eficazes com menos esforco.',
      date: '12 Janeiro 2025',
      readTime: '7 min',
      category: 'Produtividade',
      image: 'https://via.placeholder.com/400x250/3b82f6/ffffff?text=Produtividade'
    },
    {
      title: 'Seguranca em Primeiro Lugar: Como Protegemos os Seus Documentos',
      excerpt: 'Uma visao detalhada das medidas de seguranca implementadas no Fluxnote para proteger os seus dados mais importantes.',
      date: '8 Janeiro 2025',
      readTime: '6 min',
      category: 'Seguranca',
      image: 'https://via.placeholder.com/400x250/ef4444/ffffff?text=Seguranca'
    },
    {
      title: 'Colaboracao Remota: Melhores Praticas para Equipas Distribuidas',
      excerpt: 'Como manter a produtividade e coesao da equipa quando todos trabalham remotamente.',
      date: '5 Janeiro 2025',
      readTime: '8 min',
      category: 'Trabalho Remoto',
      image: 'https://via.placeholder.com/400x250/8b5cf6/ffffff?text=Trabalho+Remoto'
    },
    {
      title: 'A Evolucao dos Editores de Texto: Do Word ao Fluxnote',
      excerpt: 'Uma jornada atraves da historia dos editores de texto e como chegamos a era da colaboracao inteligente.',
      date: '2 Janeiro 2025',
      readTime: '10 min',
      category: 'Tecnologia',
      image: 'https://via.placeholder.com/400x250/f59e0b/ffffff?text=Evolucao+Editores'
    },
    {
      title: 'Como a IA Pode Melhorar a Qualidade dos Seus Textos',
      excerpt: 'Explore as funcionalidades de IA do Fluxnote que ajudam a criar textos mais claros, concisos e impactantes.',
      date: '28 Dezembro 2024',
      readTime: '6 min',
      category: 'IA & Escrita',
      image: 'https://via.placeholder.com/400x250/10b981/ffffff?text=IA+Escrita'
    }
  ];

  categories = [
    'Todos',
    'IA & Colaboracao',
    'Produtividade',
    'Seguranca',
    'Trabalho Remoto',
    'Tecnologia',
    'IA & Escrita'
  ];

  selectedCategory = signal('Todos');

  filteredPosts = computed(() => {
    if (this.selectedCategory() === 'Todos') {
      return this.blogPosts;
    }
    return this.blogPosts.filter(post => post.category === this.selectedCategory());
  });

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }
}
