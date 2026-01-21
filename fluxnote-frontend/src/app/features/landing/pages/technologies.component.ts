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

      <section class="py-20 bg-gradient-to-br from-[#155347]/10 to-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Technologies we use
            </h1>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              Fluxnote is built with modern technologies to ensure performance, scalability,
              and an exceptional user experience.
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
                    <div class="border-l-4 border-[#155347] pl-4">
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
              Technical architecture
            </h2>
            <div class="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div class="bg-[#155347]/15 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">🌐</span>
                </div>
                <h3 class="font-semibold text-gray-900 mb-2">
                  Modern frontend
                </h3>
                <p class="text-gray-600 text-sm">
                  A responsive interface built with React and TailwindCSS for a smooth experience
                </p>
              </div>
              <div>
                <div class="bg-[#155347]/15 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">⚡</span>
                </div>
                <h3 class="font-semibold text-gray-900 mb-2">
                  Scalable backend
                </h3>
                <p class="text-gray-600 text-sm">
                  A robust API with Node.js and Express, backed by PostgreSQL for secure data
                </p>
              </div>
              <div>
                <div class="bg-[#155347]/15 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span class="text-2xl">🚀</span>
                </div>
                <h3 class="font-semibold text-gray-900 mb-2">
                  Automated deployment
                </h3>
                <p class="text-gray-600 text-sm">
                  Containerized infrastructure with Docker and Kubernetes for high availability
                </p>
              </div>
            </div>
            <div class="text-center mt-8">
              <button
                (click)="goBack()"
                class="bg-[#155347] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-[#155347] transition-colors shadow-lg cursor-pointer"
              >
                Back
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
        { name: 'React', description: 'JavaScript library for building user interfaces' },
        { name: 'TipTap', description: 'Extensible rich-text editor for web applications' },
        { name: 'TailwindCSS', description: 'Utility-first CSS framework for fast, responsive design' }
      ]
    },
    {
      title: 'Backend',
      icon: '⚙️',
      technologies: [
        { name: 'Node.js', description: 'JavaScript runtime for server-side development' },
        { name: 'Express', description: 'Minimal, flexible web framework for Node.js' }
      ]
    },
    {
      title: 'Sync',
      icon: '🔄',
      technologies: [
        { name: 'Yjs', description: 'Framework for real-time collaboration and data syncing' },
        { name: 'WebSockets', description: 'Protocol for real-time bidirectional communication' }
      ]
    },
    {
      title: 'Database',
      icon: '🗄️',
      technologies: [
        { name: 'PostgreSQL', description: 'Advanced relational database management system' },
        { name: 'Firebase', description: 'Platform for authentication and push notifications' }
      ]
    },
    {
      title: 'AI Agents',
      icon: '🤖',
      technologies: [
        { name: 'OpenAI API', description: 'AI API for natural language processing' }
      ]
    },
    {
      title: 'Infrastructure',
      icon: '☁️',
      technologies: [
        { name: 'Docker', description: 'Containerization platform for consistent deployments' },
        { name: 'Kubernetes', description: 'Container orchestration system for scalability' },
        { name: 'GitHub Actions', description: 'CI/CD platform for workflow automation' }
      ]
    }
  ];

  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/']);
  }
}
