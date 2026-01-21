import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-white shadow-sm border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <button
              (click)="scrollToTop()"
              class="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img
                src="assets/icon.png"
                alt="Fluxnote Icon"
                class="w-8 h-8 mr-2 rounded"
              />
              <div class="text-2xl font-bold text-[#155347]">Fluxnote</div>
            </button>
          </div>
          <nav class="hidden md:flex space-x-8">
            <button
              (click)="scrollTo('funcionalidades')"
              class="text-gray-700 hover:text-[#155347] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              (click)="scrollTo('testemunhos')"
              class="text-gray-700 hover:text-[#155347] transition-colors cursor-pointer"
            >
              Testimonials
            </button>
            <button
              (click)="scrollTo('precos')"
              class="text-gray-700 hover:text-[#155347] transition-colors cursor-pointer"
            >
              Pricing
            </button>
            <button
              (click)="scrollTo('faq')"
              class="text-gray-700 hover:text-[#155347] transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>
          <div class="hidden md:flex items-center space-x-4">
            <button
              (click)="goToLogin()"
              class="text-gray-700 hover:text-[#155347] transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <button
              (click)="goToRegister()"
              class="bg-[#155347] text-white px-4 py-2 rounded-lg hover:bg-[#155347] transition-colors cursor-pointer"
            >
              Create account
            </button>
          </div>
          <div class="md:hidden">
            <button
              (click)="toggleMenu()"
              class="text-gray-700 hover:text-[#155347] cursor-pointer"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        @if (isMenuOpen()) {
          <div class="md:hidden py-4 border-t border-gray-100">
            <div class="flex flex-col space-y-4">
              <button
                (click)="scrollTo('funcionalidades'); closeMenu()"
                class="text-gray-700 hover:text-[#155347] transition-colors text-left cursor-pointer"
              >
                Features
              </button>
              <button
                (click)="scrollTo('testemunhos'); closeMenu()"
                class="text-gray-700 hover:text-[#155347] transition-colors text-left cursor-pointer"
              >
                Testimonials
              </button>
              <button
                (click)="scrollTo('precos'); closeMenu()"
                class="text-gray-700 hover:text-[#155347] transition-colors text-left cursor-pointer"
              >
                Pricing
              </button>
              <button
                (click)="scrollTo('faq'); closeMenu()"
                  class="text-gray-700 hover:text-[#155347] transition-colors text-left cursor-pointer"
              >
                FAQ
              </button>
              <div class="flex flex-col space-y-2 pt-4 border-t border-gray-100">
                <button
                  (click)="goToLogin(); closeMenu()"
                  class="text-gray-700 hover:text-[#155347] transition-colors text-left cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  (click)="goToRegister(); closeMenu()"
                  class="bg-[#155347] text-white px-4 py-2 rounded-lg hover:bg-[#155347] transition-colors cursor-pointer"
                >
                  Create account
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </header>
  `
})
export class LandingHeaderComponent {
  isMenuOpen = signal(false);

  constructor(private router: Router) {}

  toggleMenu(): void {
    this.isMenuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  scrollTo(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
