import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="py-20">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Terms & Conditions
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-400">
              Last updated: January 15, 2025
            </p>
          </div>

          <div class="prose prose-lg max-w-none">
            <div class="bg-[#155347]/10 border border-[#155347]/30 rounded-2xl p-8 mb-8">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Welcome to Fluxnote</h2>
              <p class="text-gray-700 dark:text-gray-300">
                These terms and conditions govern your use of the Fluxnote service.
                By using our service, you agree to these terms in full.
              </p>
            </div>

            <div class="space-y-8">
              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">1. Definitions</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <dl class="space-y-4">
                    <div>
                      <dt class="font-semibold text-gray-900 dark:text-gray-100">"Service"</dt>
                      <dd class="text-gray-700 dark:text-gray-300">Refers to the Fluxnote platform and all of its features</dd>
                    </div>
                    <div>
                      <dt class="font-semibold text-gray-900 dark:text-gray-100">"User"</dt>
                      <dd class="text-gray-700 dark:text-gray-300">Any person who accesses or uses the Service</dd>
                    </div>
                    <div>
                      <dt class="font-semibold text-gray-900 dark:text-gray-100">"Content"</dt>
                      <dd class="text-gray-700 dark:text-gray-300">Documents, text, images, and other materials created within the Service</dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">2. Use of the Service</h2>
                <div class="space-y-4">
                  <div class="bg-[#155347]/10 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Permitted uses</h3>
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>Create and edit documents for legitimate purposes</li>
                      <li>Collaborate with other users</li>
                      <li>Use AI features to improve content</li>
                      <li>Share documents with appropriate permissions</li>
                    </ul>
                  </div>

                  <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Prohibited uses</h3>
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>Create illegal, defamatory, or harmful content</li>
                      <li>Violate intellectual property rights</li>
                      <li>Attempt to access other users’ accounts</li>
                      <li>Interfere with the operation of the Service</li>
                      <li>Use the Service for spam or malicious activities</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">3. User accounts</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">User responsibilities</h3>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                    <li>Keep your login credentials confidential</li>
                    <li>Provide accurate and up-to-date information</li>
                    <li>Notify us immediately of unauthorized use</li>
                    <li>Be responsible for all activity on your account</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">4. Intellectual property</h2>
                <div class="grid md:grid-cols-2 gap-6">
                  <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Your content</h3>
                    <p class="text-gray-700 dark:text-gray-300 mb-3">
                      You retain all rights to the content you create in Fluxnote.
                    </p>
                    <p class="text-gray-700 dark:text-gray-300">
                      You grant us only a limited license to process and store your content
                      in order to provide the Service.
                    </p>
                  </div>

                  <div class="bg-[#155347]/10 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Our property</h3>
                    <p class="text-gray-700 dark:text-gray-300 mb-3">
                      Fluxnote, including its software, design, and features,
                      is owned by us and our licensors.
                    </p>
                    <p class="text-gray-700 dark:text-gray-300">
                      You may not copy, modify, or distribute our software.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">5. Plans and payments</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Subscriptions</h3>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                    <li>Paid plans are billed monthly or annually</li>
                    <li>Prices may change with 30 days’ notice</li>
                    <li>You can cancel your subscription at any time</li>
                    <li>We do not offer refunds for partial periods</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">6. Limitation of liability</h2>
                <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    The Service is provided "as is". We do not guarantee it will always be
                    available, secure, or error-free.
                  </p>
                  <p class="text-gray-700 dark:text-gray-300">
                    Our liability is limited to the amount paid for the Service
                    in the 12 months prior to the incident.
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">7. Termination</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Termination by you</h3>
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    You may terminate your account at any time through your account settings
                    or by contacting us.
                  </p>

                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Termination by us</h3>
                  <p class="text-gray-700 dark:text-gray-300">
                    We may suspend or terminate your account if you violate these terms
                    or for other legitimate reasons, with prior notice when possible.
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">8. Changes to these terms</h2>
                <div class="bg-[#155347]/10 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    We may update these terms from time to time. We will notify you of
                    significant changes by email or through the Service.
                  </p>
                  <p class="text-gray-700 dark:text-gray-300">
                    Continued use after changes constitutes acceptance of the new terms.
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">9. Governing law</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300">
                    These terms are governed by Portuguese law. Any dispute
                    will be resolved in the courts of Lisbon, Portugal.
                  </p>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">10. Contact</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    For questions about these terms, contact us:
                  </p>
                  <div class="space-y-2 text-gray-700 dark:text-gray-300">
                    <p><strong>Email:</strong> legal&#64;fluxnote.com</p>
                    <p><strong>Address:</strong> Innovation Street, 123, 1000-001 Lisbon, Portugal</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <app-landing-footer></app-landing-footer>
    </div>
  `
})
export class TermsPageComponent {}
