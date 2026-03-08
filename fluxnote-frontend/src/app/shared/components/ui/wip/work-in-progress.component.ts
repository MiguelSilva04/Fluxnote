import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent } from '../button/button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-work-in-progress',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent, TranslateModule],
  template: `
    @if (show()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="close.emit()">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6" (click)="$event.stopPropagation()">
          <div class="text-center mb-4">
          <div class="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                <lucide-icon name="construction" class="h-8 w-8 text-amber-600"></lucide-icon>
              </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'WIP.TITLE' | translate }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ 'WIP.DESC' | translate }}</p>

            <div class="space-y-2 mb-4">
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div class="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full animate-pulse progress-bar"></div>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ 'WIP.PROGRESS' | translate }}</p>
            </div>
          </div>

          <app-button
            customClass="w-full bg-[#155347] hover:bg-[#0d3d31]"
            (click)="close.emit()"
          >
            {{ 'COMMON.GOT_IT' | translate }}
          </app-button>
        </div>
      </div>
    }
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
export class WorkInProgressComponent {
  show = input<boolean>(false);
  close = output<void>();
}
