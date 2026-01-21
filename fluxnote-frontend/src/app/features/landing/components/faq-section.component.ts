import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-faq-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section id="faq" class="py-20 bg-white">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Frequently asked questions
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to the most common questions about Fluxnote and its features.
          </p>
        </div>

        <div class="space-y-4">
          @for (faq of faqs; track faq.question; let i = $index) {
            <div class="bg-gray-50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <button
                (click)="toggleFaq(i)"
                class="w-full px-6 py-6 text-left flex justify-between items-center hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 class="text-lg font-semibold text-gray-900 pr-4">
                  {{ faq.question }}
                </h3>
                <div class="flex-shrink-0">
                  <svg
                    [class]="'w-6 h-6 text-[#155347] transform transition-transform ' + (openIndex() === i ? 'rotate-180' : '')"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              @if (openIndex() === i) {
                <div class="px-6 pb-6">
                  <div class="border-t border-gray-200 pt-4">
                    <p class="text-gray-700 leading-relaxed">
                      {{ faq.answer }}
                    </p>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="text-center mt-12">
          <p class="text-gray-600 mb-4">
            Didn’t find the answer you were looking for?
          </p>
          <button
            (click)="goToContact()"
            class="bg-[#155347] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#155347] transition-colors shadow-lg cursor-pointer"
          >
            Contact support
          </button>
        </div>
      </div>
    </section>
  `
})
export class FaqSectionComponent {
  openIndex = signal<number | null>(null);

  faqs = [
    {
      question: 'How does AI work in Fluxnote?',
      answer: 'Fluxnote AI helps with content creation, grammar corrections, improvement suggestions, and automatic formatting. It learns from your writing style and offers personalized suggestions to make your documents more effective.'
    },
    {
      question: 'How many people can collaborate on a document at the same time?',
      answer: 'The number of collaborators depends on your plan: the Free plan supports up to 2 people, Pro up to 10, and the Team plan offers unlimited collaboration. All changes are synced in real time.'
    },
    {
      question: 'Is my data safe in Fluxnote?',
      answer: 'Yes—security is our priority. We use end-to-end encryption, secure cloud storage, and comply with GDPR. Your documents are private and only accessible to you and the people you authorize.'
    },
    {
      question: 'Can I use Fluxnote offline?',
      answer: 'Fluxnote is primarily online to ensure real-time syncing. However, we offer limited offline functionality that lets you view and edit recent documents, with automatic syncing when you’re back online.'
    },
    {
      question: 'How does version history work?',
      answer: 'Every change is automatically saved. You can review previous versions, compare changes, and restore any earlier version. The Free plan keeps 7 days of history, while paid plans offer full history.'
    },
    {
      question: 'Can I import documents from other platforms?',
      answer: 'Yes. Fluxnote supports imports from Microsoft Word, Google Docs, PDF, and other popular formats. Formatting is preserved and you can start collaborating right after import.'
    },
    {
      question: 'How do I cancel my subscription?',
      answer: 'You can cancel anytime from your account settings. You’ll keep access to premium features until the end of your billing period, and you can subscribe again whenever you like.'
    },
    {
      question: 'Is there a mobile version of Fluxnote?',
      answer: 'Yes. Fluxnote is fully responsive and works great on mobile devices in your browser. Native iOS and Android apps are also in development and will be available soon.'
    },
    {
      question: 'What types of documents can I create?',
      answer: 'Fluxnote is versatile—you can create reports, proposals, articles, presentations, manuals, contracts, and any kind of text document. The AI adapts to the type of content you’re creating.'
    },
    {
      question: 'How does support work?',
      answer: 'We offer email support for all users, priority support for Pro users, and dedicated support for teams. We also provide a full knowledge base and video tutorials.'
    }
  ];

  constructor(private router: Router) {}

  toggleFaq(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }

  goToContact(): void {
    this.router.navigate(['/contact']);
  }
}
