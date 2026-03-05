import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [CommonModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="bg-gradient-to-br from-[#155347]/10 to-white dark:to-gray-900 py-20 lg:py-32">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              See how Fluxnote works in practice
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              Watch an interactive demo of document creation with AI assistance and real-time collaboration.
            </p>
          </div>

          <div class="max-w-4xl mx-auto mb-12">
            <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              <div class="relative">
                <img
                  src="assets/videoBackground.jpg"
                  alt="Fluxnote demo - AI collaboration"
                  class="w-full h-96 lg:h-[500px] object-cover"
                />
                <div class="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <button class="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-6 transition-all transform hover:scale-105 shadow-lg cursor-pointer">
                    <svg class="w-12 h-12 text-[#155347] dark:text-emerald-400 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="text-center">
            <button (click)="goToRegister()" class="bg-[#155347] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-[#155347] transition-colors shadow-lg cursor-pointer">
              Create an account and try it
            </button>
          </div>
        </div>
      </section>

      <!-- Interactive Steps Section -->
      <section class="py-20 bg-gray-50 dark:bg-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              How it works in 4 simple steps
            </h2>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              See how easy it is to create professional documents with AI assistance.
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            @for (step of steps; track step.title; let i = $index) {
              <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center relative">
                <div class="inline-flex items-center justify-center w-20 h-20 bg-[#155347]/15 rounded-full text-[#155347] dark:text-emerald-400 mb-6" [innerHTML]="step.icon"></div>
                <div class="absolute top-4 left-4 bg-[#155347] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  {{ i + 1 }}
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {{ step.title }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400">
                  {{ step.description }}
                </p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Testimonial Section -->
      <section class="py-20 bg-[#155347]/10">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-lg">
            <div class="mb-8">
              <svg class="w-12 h-12 text-[#155347] dark:text-emerald-400 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
              </svg>
            </div>
            <blockquote class="text-2xl text-gray-900 dark:text-gray-100 font-medium mb-8">
              "The demo convinced my whole team—now we use Fluxnote every day!"
            </blockquote>
            <div class="flex items-center justify-center">
              <div class="w-12 h-12 rounded-full overflow-hidden mr-4">
                <img
                  src="assets/sofia.jpg"
                  alt="Sofia Mendes"
                  class="w-full h-full object-cover"
                />
              </div>
              <div class="text-left">
                <div class="font-semibold text-gray-900 dark:text-gray-100">Sofia Mendes</div>
                <div class="text-gray-600 dark:text-gray-400">Project Manager, TechFlow</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Final Call to Action -->
      <section class="py-20 bg-gray-900 text-white">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl lg:text-4xl font-bold mb-6">
            Ready to try Fluxnote?
          </h2>
          <p class="text-xl text-gray-300 mb-8">
            No credit card required. Get started in under a minute.
          </p>
          <button (click)="goToRegister()" class="bg-[#155347] text-white px-12 py-4 rounded-xl text-xl font-semibold hover:bg-[#155347] transition-colors shadow-lg cursor-pointer">
            Create a free account
          </button>
          <p class="text-gray-400 mt-4">
            Join thousands of professionals who trust Fluxnote
          </p>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class DemoPageComponent {
  steps = [
    {
      icon: `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>`,
      title: 'Create a new document',
      description: 'Start a new document in seconds with smart templates or a blank page.'
    },
    {
      icon: `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>`,
      title: 'Invite teammates',
      description: 'Add teammates with one click and set custom editing permissions.'
    },
    {
      icon: `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>`,
      title: 'Get AI suggestions',
      description: 'AI provides text improvements, corrections, and content suggestions in real time.'
    },
    {
      icon: `<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`,
      title: 'Restore earlier versions',
      description: 'Access the full change history and restore any previous version with ease.'
    }
  ];

  constructor(private router: Router) {}

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
