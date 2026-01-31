import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent, BadgeComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-version-history',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent, BadgeComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-4">
          <button (click)="goBack()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <lucide-icon name="arrow-left" class="h-5 w-5 text-gray-600"></lucide-icon>
          </button>
          <div>
            <h1 class="text-lg font-bold text-gray-900">Version Comparison</h1>
            <p class="text-xs text-gray-500">Comparing Version 7 and Version 6</p>
          </div>
        </div>
        <app-button customClass="bg-[#155347] hover:bg-[#0d3d31]">Restore Version 7</app-button>
      </header>

      <!-- Warning Banner -->
      <div class="bg-amber-50 border-b border-amber-200 px-6 py-3">
        <div class="flex items-center gap-2 text-amber-800">
          <lucide-icon name="triangle-alert" class="h-5 w-5"></lucide-icon>
          <p class="text-sm">
            <strong>Warning:</strong> Restoring a version will replace the current document content.
            This action cannot be undone.
          </p>
        </div>
      </div>

      <!-- Comparison View -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Version 7 (Current) -->
        <div class="flex-1 flex flex-col border-r border-gray-200">
          <div class="p-4 bg-white border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-sm font-bold text-gray-900">Version 7</h2>
                  <app-badge variant="success">Current</app-badge>
                </div>
                <p class="text-xs text-gray-500">João Silva • 2 hours ago</p>
              </div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-6 bg-white">
            <div class="prose max-w-none">
              <h3 class="text-xl font-bold text-gray-900 mb-4">Market Analysis 2024</h3>
              <p class="text-gray-800 mb-4">
                The year 2024 marks a period of unprecedented transformation in the global scenario,
                primarily driven by the rapid evolution and adoption of new technologies.
              </p>
              <p class="text-gray-800 mb-4 bg-green-100 px-2 py-1 rounded">
                Artificial intelligence (AI) continues to be a central engine behind this change,
                redefining sectors from manufacturing to services.
              </p>
              <p class="text-gray-800">
                Beyond AI, quantum computing and biotechnology are also emerging as fields with the
                potential to revolutionize the technological landscape.
              </p>
            </div>
          </div>
        </div>

        <!-- Version 6 -->
        <div class="flex-1 flex flex-col">
          <div class="p-4 bg-white border-b border-gray-200">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-sm font-bold text-gray-900">Version 6</h2>
                  <app-badge variant="outline">Previous</app-badge>
                </div>
                <p class="text-xs text-gray-500">Ana Clara • Yesterday at 14:30</p>
              </div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-6 bg-white">
            <div class="prose max-w-none">
              <h3 class="text-xl font-bold text-gray-900 mb-4">Market Analysis 2024</h3>
              <p class="text-gray-800 mb-4">
                The year 2024 marks a period of unprecedented transformation in the global scenario,
                primarily driven by the rapid evolution and adoption of new technologies.
              </p>
              <p class="text-gray-800 mb-4 bg-red-100 px-2 py-1 rounded line-through">
                AI is becoming increasingly important in various industries.
              </p>
              <p class="text-gray-800">
                Beyond AI, quantum computing and biotechnology are also emerging as fields with the
                potential to revolutionize the technological landscape.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="bg-white border-t border-gray-200 px-6 py-3">
        <div class="flex items-center gap-6 text-sm">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-green-100 rounded"></div>
            <span class="text-gray-600">Added content</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-red-100 rounded"></div>
            <span class="text-gray-600">Removed content</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-yellow-100 rounded"></div>
            <span class="text-gray-600">Modified content</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class VersionHistoryComponent {
  private router = inject(Router);

  goBack(): void {
    this.router.navigate(['/editor']);
  }
}
