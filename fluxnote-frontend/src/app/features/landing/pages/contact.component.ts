import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="py-20 bg-gradient-to-br from-[#155347]/10 to-white dark:to-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Contact us
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Have a question, suggestion, or need help? We’re here for you.
              Reach out using any of the methods below.
            </p>
          </div>

          <div class="grid lg:grid-cols-2 gap-12">
            <!-- Contact Form -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Send us a message</h2>

              @if (submitStatus() === 'success') {
                <div class="mb-6 p-4 bg-[#155347]/10 border border-[#155347]/30 rounded-lg">
                  <p class="text-[#155347] dark:text-emerald-400 font-medium">
                    Message sent successfully! We’ll get back to you soon.
                  </p>
                </div>
              }

              @if (submitStatus() === 'error') {
                <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p class="text-red-800">
                    There was an error sending your message. Please try again.
                  </p>
                </div>
              }

              <form (submit)="handleSubmit($event)" class="space-y-6">
                <div class="grid md:grid-cols-2 gap-6">
                  <div>
                    <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full name
                    </label>
                    <input
                      id="name"
                      type="text"
                      [(ngModel)]="formData.name"
                      name="name"
                      class="text-black w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155347]"
                      required
                    />
                  </div>

                  <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      [(ngModel)]="formData.email"
                      name="email"
                      class="text-black w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155347]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label for="subject" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    [(ngModel)]="formData.subject"
                    name="subject"
                    class="text-black w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155347]"
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="suporte">Technical support</option>
                    <option value="vendas">Sales questions</option>
                    <option value="feedback">Product feedback</option>
                    <option value="parceria">Partnership opportunities</option>
                    <option value="outro">Other</option>
                  </select>
                </div>

                <div>
                  <label for="message" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows="6"
                    [(ngModel)]="formData.message"
                    name="message"
                    class="text-black w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155347]"
                    placeholder="Describe your question or message..."
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  [disabled]="isSubmitting()"
                  class="w-full bg-[#155347] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#155347] focus:outline-none focus:ring-2 focus:ring-[#155347] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  @if (isSubmitting()) {
                    <div class="flex items-center justify-center">
                      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </div>
                  } @else {
                    Send message
                  }
                </button>
              </form>
            </div>

            <!-- Contact Methods -->
            <div class="space-y-8">
              <div>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Other ways to reach us</h2>
                <div class="space-y-6">
                  @for (method of contactMethods; track method.title) {
                    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                      <div class="flex items-start">
                        <div class="text-3xl mr-4">{{ method.icon }}</div>
                        <div class="flex-1">
                          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {{ method.title }}
                          </h3>
                          <p class="text-gray-600 dark:text-gray-400 mb-3">
                            {{ method.description }}
                          </p>
                          <p class="text-[#155347] dark:text-emerald-400 font-medium mb-3">
                            {{ method.contact }}
                          </p>
                          <button class="text-[#155347] dark:text-emerald-400 font-semibold hover:text-[#155347] dark:hover:text-emerald-400 transition-colors cursor-pointer">
                            {{ method.action }} →
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Office Info -->
              <div class="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Office</h3>
                <div class="space-y-2 text-gray-700 dark:text-gray-300">
                  <p><strong>Address:</strong></p>
                  <p>Innovation Street, 123</p>
                  <p>1000-001 Lisboa, Portugal</p>
                  <p class="mt-3"><strong>Hours:</strong></p>
                  <p>Monday to Friday: 9:00 AM - 6:00 PM</p>
                  <p>Saturday: 10:00 AM - 2:00 PM</p>
                </div>
              </div>

              <!-- FAQ Link -->
              <div class="bg-[#155347]/10 rounded-2xl p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Before you contact us
                </h3>
                <p class="text-gray-700 dark:text-gray-300 mb-4">
                  Check our FAQ—you might find your answer faster.
                </p>
                <button class="text-[#155347] font-semibold hover:text-[#155347] transition-colors">
                  View FAQ →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class ContactPageComponent {
  formData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  isSubmitting = signal(false);
  submitStatus = signal<'idle' | 'success' | 'error'>('idle');

  contactMethods = [
    {
      icon: '📧',
      title: 'Email',
      description: 'Send us an email and we’ll reply within 24 hours',
      contact: 'suporte@fluxnote.com',
      action: 'Send email'
    },
    {
      icon: '💬',
      title: 'Live chat',
      description: 'Chat with us in real time during business hours',
      contact: 'Mon–Fri, 9 AM–6 PM',
      action: 'Start chat'
    },
    {
      icon: '📞',
      title: 'Phone',
      description: 'Call us for immediate support',
      contact: '+351 21 123 4567',
      action: 'Call now'
    }
  ];

  async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.isSubmitting.set(true);
    this.submitStatus.set('idle');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.submitStatus.set('success');
      this.formData = { name: '', email: '', subject: '', message: '' };
    } catch {
      this.submitStatus.set('error');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
