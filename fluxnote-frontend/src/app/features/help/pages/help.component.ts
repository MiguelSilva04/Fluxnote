import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-12">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-[#155347] rounded-full mb-4">
            <lucide-icon name="badge-question-mark" class="h-8 w-8 text-white"></lucide-icon>
          </div>
          <h1 class="text-4xl font-bold text-gray-900 mb-4">How can we help you?</h1>
          <p class="text-lg text-gray-600 mb-8">Search our knowledge base or browse categories below</p>

          <!-- Search Bar -->
          <div class="max-w-2xl mx-auto relative">
            <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"></lucide-icon>
            <input
              type="text"
              placeholder="Search for help articles..."
              [(ngModel)]="searchQuery"
              class="w-full h-14 pl-12 pr-4 rounded-xl border-2 border-gray-200 focus:border-[#155347] focus:outline-none text-base shadow-sm"
            />
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <app-card customClass="hover:shadow-lg transition-shadow cursor-pointer">
            <app-card-content customClass="p-6 text-center">
              <div class="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <lucide-icon name="book" class="h-6 w-6 text-blue-600"></lucide-icon>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Documentation</h3>
              <p class="text-sm text-gray-600 mb-4">Browse our comprehensive guides</p>
              <app-button variant="outline" size="sm" customClass="w-full">View Docs</app-button>
            </app-card-content>
          </app-card>

          <app-card customClass="hover:shadow-lg transition-shadow cursor-pointer">
            <app-card-content customClass="p-6 text-center">
              <div class="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <lucide-icon name="message-circle" class="h-6 w-6 text-green-600"></lucide-icon>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Live Chat</h3>
              <p class="text-sm text-gray-600 mb-4">Chat with our support team</p>
              <app-button variant="outline" size="sm" customClass="w-full">Start Chat</app-button>
            </app-card-content>
          </app-card>

          <app-card customClass="hover:shadow-lg transition-shadow cursor-pointer">
            <app-card-content customClass="p-6 text-center">
              <div class="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                <lucide-icon name="mail" class="h-6 w-6 text-purple-600"></lucide-icon>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">Email Support</h3>
              <p class="text-sm text-gray-600 mb-4">Get help via email</p>
              <app-button variant="outline" size="sm" customClass="w-full">Contact Us</app-button>
            </app-card-content>
          </app-card>
        </div>

        <!-- Categories -->
        <div class="mb-12">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (category of categories; track category.id) {
              <app-card customClass="hover:shadow-lg transition-shadow cursor-pointer">
                <app-card-content customClass="p-6">
                  <div class="flex items-start gap-4">
                    <div class="text-4xl">{{ category.icon }}</div>
                    <div class="flex-1">
                      <h3 class="text-lg font-bold text-gray-900 mb-1">{{ category.name }}</h3>
                      <p class="text-sm text-gray-600 mb-2">{{ category.description }}</p>
                      <p class="text-xs text-gray-500">{{ category.articles }} articles</p>
                    </div>
                    <lucide-icon name="chevron-right" class="h-5 w-5 text-gray-400"></lucide-icon>
                  </div>
                </app-card-content>
              </app-card>
            }
          </div>
        </div>

        <!-- Popular Articles -->
        <div class="mb-12">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Popular Articles</h2>
          <app-card>
            <app-card-content customClass="p-0">
              <div class="divide-y divide-gray-100">
                @for (article of popularArticles; track article.id) {
                  <div class="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between">
                    <div class="flex-1">
                      <h4 class="text-sm font-medium text-gray-900 mb-1">{{ article.title }}</h4>
                      <div class="flex items-center gap-3 text-xs text-gray-500">
                        <span class="px-2 py-1 bg-gray-100 rounded">{{ article.category }}</span>
                        <span>{{ article.views }}</span>
                      </div>
                    </div>
                    <lucide-icon name="chevron-right" class="h-5 w-5 text-gray-400"></lucide-icon>
                  </div>
                }
              </div>
            </app-card-content>
          </app-card>
        </div>

        <!-- FAQs -->
        <div class="mb-12">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div class="space-y-4">
            @for (faq of faqs; track faq.question) {
              <app-card>
                <app-card-content customClass="p-6">
                  <h4 class="text-base font-bold text-gray-900 mb-2">{{ faq.question }}</h4>
                  <p class="text-sm text-gray-600">{{ faq.answer }}</p>
                </app-card-content>
              </app-card>
            }
          </div>
        </div>

        <!-- Contact Support -->
        <app-card customClass="bg-gradient-to-br from-[#155347] to-[#0d3d31] text-white">
          <app-card-content customClass="p-8 text-center">
            <h2 class="text-2xl font-bold mb-4">Still need help?</h2>
            <p class="text-white/90 mb-6">Our support team is available 24/7 to assist you with any questions or issues.</p>
            <div class="flex items-center justify-center gap-4">
              <app-button variant="outline" customClass="bg-white text-[#155347] hover:bg-gray-100">Contact Support</app-button>
              <app-button variant="outline" customClass="bg-transparent border-white text-white hover:bg-white/10">Schedule a Call</app-button>
            </div>
          </app-card-content>
        </app-card>
      </div>
    </app-dashboard-layout>
  `
})
export class HelpComponent {
  searchQuery = '';

  popularArticles = [
    { id: 1, title: 'Getting Started with Fluxnote', category: 'Basics', views: '12.5k views' },
    { id: 2, title: 'How to Share Documents with Your Team', category: 'Collaboration', views: '8.2k views' },
    { id: 3, title: 'Using AI Assistant Features', category: 'AI Tools', views: '15.3k views' },
    { id: 4, title: 'Managing Team Permissions', category: 'Teams', views: '6.7k views' },
    { id: 5, title: 'Version History and Document Recovery', category: 'Features', views: '9.1k views' },
    { id: 6, title: 'Subscription Plans Explained', category: 'Billing', views: '11.4k views' }
  ];

  categories = [
    { id: 1, name: 'Getting Started', icon: '🚀', articles: 12, description: 'Learn the basics of Fluxnote' },
    { id: 2, name: 'Collaboration', icon: '👥', articles: 18, description: 'Work together with your team' },
    { id: 3, name: 'AI Features', icon: '🤖', articles: 15, description: 'Leverage AI to enhance your work' },
    { id: 4, name: 'Account & Billing', icon: '💳', articles: 10, description: 'Manage your subscription' }
  ];

  faqs = [
    { question: 'How do I upgrade my plan?', answer: 'Go to Settings > Subscriptions and select the plan you want to upgrade to.' },
    { question: 'Can I collaborate with people outside my organization?', answer: "Yes! You can share documents with anyone by email, even if they don't have a Fluxnote account." },
    { question: 'How does version history work?', answer: 'Fluxnote automatically saves versions of your documents. Click the History button in any document to view and restore previous versions.' },
    { question: 'What happens to my documents if I downgrade?', answer: 'Your documents remain safe. However, some features may become unavailable depending on your new plan.' }
  ];
}
