import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="py-20 bg-gradient-to-br from-[#155347]/10 to-white dark:to-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Fluxnote Blog
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Insights, tips, and updates on collaboration, artificial intelligence,
              and productivity in modern work.
            </p>
          </div>

          <!-- Category Filter -->
          <div class="flex flex-wrap justify-center gap-4 mb-12">
            @for (category of categories; track category) {
              <button
                (click)="selectCategory(category)"
                [class]="'px-6 py-2 rounded-full font-medium transition-colors cursor-pointer ' + (selectedCategory() === category ? 'bg-[#155347] text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-[#155347]/10 hover:text-[#155347] dark:hover:text-emerald-400 border border-gray-200 dark:border-gray-700')"
              >
                {{ category }}
              </button>
            }
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (post of filteredPosts(); track post.title) {
              <article class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <div class="relative">
                  <img
                    [src]="post.image"
                    [alt]="post.title"
                    class="w-full h-48 object-cover"
                  />
                  <div class="absolute top-4 left-4">
                    <span class="bg-[#155347] text-white px-3 py-1 rounded-full text-sm font-medium">
                      {{ post.category }}
                    </span>
                  </div>
                </div>

                <div class="p-6">
                  <div class="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <span>{{ post.date }}</span>
                    <span class="mx-2">•</span>
                    <span>{{ post.readTime }} read</span>
                  </div>

                  <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
                    {{ post.title }}
                  </h2>

                  <p class="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {{ post.excerpt }}
                  </p>

                  <button class="text-[#155347] dark:text-emerald-400 font-semibold hover:text-[#155347] dark:hover:text-emerald-400 transition-colors cursor-pointer">
                    Read more →
                  </button>
                </div>
              </article>
            }
          </div>

          <div class="mt-16 bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Don’t miss a post
            </h2>
            <p class="text-black mb-6">
              Subscribe to our newsletter and get the best articles on productivity and collaboration.
            </p>
            <div class="max-w-md mx-auto flex">
              <input
                type="email"
                placeholder="Your email"
                class="flex-1 px-4 py-3 border text-black border-gray-300 dark:border-gray-600 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-[#155347]"
              />
              <button class="bg-[#155347] text-white px-6 py-3 rounded-r-xl font-semibold hover:bg-[#155347] transition-colors cursor-pointer">
                Subscribe
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
      title: 'The Future of Collaboration: How AI Is Transforming Teamwork',
      excerpt: 'Discover how artificial intelligence is changing the way teams collaborate and create content together.',
      date: 'Jan 15, 2025',
      readTime: '5 min',
      category: 'AI & Collaboration',
      image: 'https://via.placeholder.com/400x250/22c55e/ffffff?text=AI+Collaboration'
    },
    {
      title: '10 Tips to Maximize Productivity When Creating Documents',
      excerpt: 'Practical strategies to optimize your workflow and create more effective documents with less effort.',
      date: 'Jan 12, 2025',
      readTime: '7 min',
      category: 'Productivity',
      image: 'https://via.placeholder.com/400x250/3b82f6/ffffff?text=Productivity'
    },
    {
      title: 'Security First: How We Protect Your Documents',
      excerpt: 'A detailed look at the security measures Fluxnote uses to protect your most important data.',
      date: 'Jan 8, 2025',
      readTime: '6 min',
      category: 'Security',
      image: 'https://via.placeholder.com/400x250/ef4444/ffffff?text=Security'
    },
    {
      title: 'Remote Collaboration: Best Practices for Distributed Teams',
      excerpt: 'How to maintain productivity and team cohesion when everyone works remotely.',
      date: 'Jan 5, 2025',
      readTime: '8 min',
      category: 'Remote Work',
      image: 'https://via.placeholder.com/400x250/8b5cf6/ffffff?text=Remote+Work'
    },
    {
      title: 'The Evolution of Text Editors: From Word to Fluxnote',
      excerpt: 'A journey through the history of text editors—and how we arrived at the era of intelligent collaboration.',
      date: 'Jan 2, 2025',
      readTime: '10 min',
      category: 'Technology',
      image: 'https://via.placeholder.com/400x250/f59e0b/ffffff?text=Text+Editors'
    },
    {
      title: 'How AI Can Improve the Quality of Your Writing',
      excerpt: 'Explore Fluxnote’s AI features that help you write clearer, more concise, and more impactful text.',
      date: 'Dec 28, 2024',
      readTime: '6 min',
      category: 'AI & Writing',
      image: 'https://via.placeholder.com/400x250/10b981/ffffff?text=AI+Writing'
    }
  ];

  categories = [
    'All',
    'AI & Collaboration',
    'Productivity',
    'Security',
    'Remote Work',
    'Technology',
    'AI & Writing'
  ];

  selectedCategory = signal('All');

  filteredPosts = computed(() => {
    if (this.selectedCategory() === 'All') {
      return this.blogPosts;
    }
    return this.blogPosts.filter(post => post.category === this.selectedCategory());
  });

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }
}
