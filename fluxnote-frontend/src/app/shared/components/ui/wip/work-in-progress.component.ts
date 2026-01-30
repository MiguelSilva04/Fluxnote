import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-work-in-progress',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-gray-50 py-16 px-4">
      <div class="w-full max-w-md mx-auto bg-white shadow-lg rounded-2xl border border-gray-200 px-8 py-12 text-center space-y-6">
        <div class="flex justify-center space-x-4">
          <lucide-icon name="construction" class="w-8 h-8 text-orange-500 animate-bounce"></lucide-icon>
          <lucide-icon name="wrench" class="w-8 h-8 text-blue-500 animate-bounce delay-200"></lucide-icon>
          <lucide-icon name="cog" class="w-8 h-8 text-green-500 animate-bounce delay-400"></lucide-icon>
        </div>

        <div class="space-y-2">
          <h1 class="text-2xl font-bold text-gray-900">
            Work in Progress
          </h1>
          <p class="text-gray-600">
            Esta funcionalidade ainda está a ser desenvolvida.
          </p>
        </div>

        <div class="space-y-2">
          <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full animate-pulse progress-bar"></div>
          </div>
          <p class="text-sm text-gray-500">
            Em breve estará disponível!
          </p>
        </div>

        <div class="pt-4">
          <p class="text-sm text-gray-400 italic">
            A construir algo incrível...
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delay-200 {
      animation-delay: 0.2s;
    }
    .delay-400 {
      animation-delay: 0.4s;
    }
    .progress-bar {
      width: 60%;
    }
  `]
})
export class WorkInProgressComponent {}
