import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="py-20 bg-gradient-to-br from-[#155347]/10 to-white dark:to-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              About Fluxnote
            </h1>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto">
              We’re a team passionate about technology and collaboration, dedicated to
              transforming how people create and share knowledge.
            </p>
          </div>

          <div class="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Our mission</h2>
              <p class="text-gray-700 dark:text-gray-300 mb-6 text-lg">
                Democratize access to intelligent collaboration tools, enabling teams of any size to
                create professional-quality documents with the help of AI.
              </p>
              <p class="text-gray-700 dark:text-gray-300 text-lg">
                We believe that when people have the right tools, they can focus on what truly matters:
                their ideas and creativity.
              </p>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <img
                src="assets/ourMission.png"
                alt="Fluxnote team at work"
                class="w-full h-64 object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="py-20 bg-white dark:bg-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Our values
            </h2>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              These values guide everything we do—from product development to customer support.
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            @for (value of values; track value.title) {
              <div class="text-center">
                <div class="text-4xl mb-4">{{ value.icon }}</div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {{ value.title }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400">
                  {{ value.description }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="py-20 bg-gray-50 dark:bg-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Meet our team
            </h2>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Talented, dedicated people working every day to make Fluxnote better.
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            @for (member of teamMembers; track member.name) {
              <div class="bg-white dark:bg-gray-700 rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div class="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4">
                  <img
                    [src]="member.image"
                    [alt]="member.name"
                    class="w-full h-full object-cover"
                  />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {{ member.name }}
                </h3>
                <p class="text-[#155347] font-medium mb-3">
                  {{ member.role }}
                </p>
                <p class="text-gray-600 dark:text-gray-400 text-sm">
                  {{ member.description }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="py-20 bg-white dark:bg-gray-900">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Our journey
            </h2>
            <p class="text-xl text-gray-600 dark:text-gray-400">
              From the first idea to today—see how Fluxnote has evolved.
            </p>
          </div>

          <div class="relative">
            <div class="absolute left-8 top-0 bottom-0 w-0.5 bg-[#155347]/40"></div>

            <div class="space-y-12">
              @for (milestone of milestones; track milestone.year) {
                <div class="relative flex items-start">
                  <div class="absolute left-6 w-4 h-4 bg-[#155347] rounded-full border-4 border-white shadow-lg"></div>
                  <div class="ml-16 bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                    <div class="flex items-center mb-3">
                      <span class="text-sm font-semibold text-[#155347] bg-[#155347]/15 px-3 py-1 rounded-full">
                        {{ milestone.year }}
                      </span>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {{ milestone.title }}
                    </h3>
                    <p class="text-gray-700 dark:text-gray-300">
                      {{ milestone.description }}
                    </p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <section class="py-20 bg-[#155347] text-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl lg:text-4xl font-bold mb-6">
            Join our mission
          </h2>
          <p class="text-xl mb-8 opacity-90">
            Want to be part of the digital collaboration revolution?
            We’re always looking for exceptional talent.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <button class="border-2 bg-white text-[#155347] px-8 py-3 rounded-xl font-semibold hover:bg-[#155347] hover:text-white hover:border-2 border-white transition-colors cursor-pointer">
              View opportunities
            </button>
            <button class="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white hover:text-[#155347] transition-colors cursor-pointer">
              Contact us
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
      role: 'CEO & Founder',
      description: 'Software engineer with expertise in AI and distributed systems.',
      image: 'assets/miguelsilva.png'
    },
    {
      name: 'Ana Rodrigues',
      role: 'Intern',
      description: 'Product specialist with 10 years of experience in technology.',
      image: 'assets/anaRodriges.jpg'
    },
    {
      name: 'Sofia Mendes',
      role: 'Intern',
      description: 'UX/UI designer passionate about creating intuitive and accessible experiences.',
      image: 'assets/sofiaMendes.jpg'
    },
    {
      name: 'Joao Ferreira',
      role: 'Intern',
      description: 'Full-stack developer focused on performance and scalability.',
      image: 'assets/joaoFerreira.jpg'
    }
  ];

  values = [
    {
      icon: '🚀',
      title: 'Innovation',
      description: 'We’re always exploring new technologies to improve our users’ experience.'
    },
    {
      icon: '🤝',
      title: 'Collaboration',
      description: 'We believe the best ideas happen when people work together.'
    },
    {
      icon: '🔒',
      title: 'Transparency',
      description: 'We’re open about how we operate and how we protect your data.'
    },
    {
      icon: '🎯',
      title: 'User focus',
      description: 'Every decision is made with the best experience for you in mind.'
    }
  ];

  milestones = [
    {
      year: '2023',
      title: 'Fluxnote founded',
      description: 'Development began with a focus on collaboration and AI.'
    },
    {
      year: '2024',
      title: 'Beta launch',
      description: 'First version released to selected users.'
    },
    {
      year: '2025',
      title: 'Public launch',
      description: 'Platform opened to the public with full features.'
    }
  ];
}
