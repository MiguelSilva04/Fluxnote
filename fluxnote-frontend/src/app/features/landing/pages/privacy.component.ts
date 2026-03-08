import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingHeaderComponent, LandingFooterComponent } from '../components';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, LandingHeaderComponent, LandingFooterComponent],
  template: `
    <div class="min-h-screen bg-white dark:bg-gray-900">
      <app-landing-header></app-landing-header>

      <section class="py-20">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h1 class="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Privacy Policy
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-400">
              Last updated: January 15, 2025
            </p>
          </div>

          <div class="prose prose-lg max-w-none">
            <div class="bg-[#155347]/10 border border-[#155347]/30 rounded-2xl p-8 mb-8">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Policy summary</h2>
              <p class="text-gray-700 dark:text-gray-300">
                At Fluxnote, your privacy is fundamental. We collect only the data necessary to
                provide our service, we never sell your information to third parties, and we give you
                full control over your data.
              </p>
            </div>

            <div class="space-y-8">
              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">1. Information we collect</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Account information</h3>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                    <li>Full name and email address</li>
                    <li>Password (encrypted)</li>
                    <li>Optional profile information</li>
                  </ul>
                </div>

                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mt-4">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Content and documents</h3>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                    <li>Documents created and edited on the platform</li>
                    <li>Comments and suggestions</li>
                    <li>Document version history</li>
                  </ul>
                </div>

                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mt-4">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Usage data</h3>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                    <li>Information about how you use the service</li>
                    <li>Performance and diagnostic data</li>
                    <li>IP address and device information</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">2. How we use your information</h2>
                <div class="grid md:grid-cols-2 gap-6">
                  <div class="bg-[#155347]/10 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Providing the service</h3>
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>Create and maintain your account</li>
                      <li>Process and store documents</li>
                      <li>Enable real-time collaboration</li>
                    </ul>
                  </div>

                  <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Improving the product</h3>
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>Analyze usage patterns</li>
                      <li>Develop new features</li>
                      <li>Improve AI performance</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">3. Sharing information</h2>
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">We never sell your data</h3>
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    Fluxnote never sells, rents, or trades your personal information to third parties.
                  </p>
                  <p class="text-gray-700 dark:text-gray-300">
                    We only share information in very specific circumstances:
                  </p>
                  <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 mt-3 space-y-1">
                    <li>With your explicit consent</li>
                    <li>To comply with legal obligations</li>
                    <li>With essential service providers (under confidentiality agreements)</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">4. Data security</h2>
                <div class="grid md:grid-cols-3 gap-6">
                  <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
                    <div class="text-3xl mb-3">🔒</div>
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Encryption</h3>
                    <p class="text-gray-700 dark:text-gray-300 text-sm">All data is encrypted in transit and at rest</p>
                  </div>

                  <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
                    <div class="text-3xl mb-3">🛡️</div>
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Controlled access</h3>
                    <p class="text-gray-700 dark:text-gray-300 text-sm">Access limited to authorized personnel only</p>
                  </div>

                  <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 text-center">
                    <div class="text-3xl mb-3">🔍</div>
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Monitoring</h3>
                    <p class="text-gray-700 dark:text-gray-300 text-sm">Continuous security monitoring</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">5. Your rights</h2>
                <div class="bg-[#155347]/10 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    In accordance with GDPR and other data protection laws, you have the following rights:
                  </p>
                  <div class="grid md:grid-cols-2 gap-4">
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>Access to your personal data</li>
                      <li>Correction of inaccurate information</li>
                      <li>Deletion of your data</li>
                    </ul>
                    <ul class="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                      <li>Data portability</li>
                      <li>Restriction of processing</li>
                      <li>Objection to processing</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">6. Contact</h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                  <p class="text-gray-700 dark:text-gray-300 mb-4">
                    For privacy questions or to exercise your rights, contact us:
                  </p>
                  <div class="space-y-2 text-gray-700 dark:text-gray-300">
                    <p><strong>Email:</strong> privacy&#64;fluxnote.com</p>
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
export class PrivacyPageComponent {}
