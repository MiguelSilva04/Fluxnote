import { ChangeDetectorRef, Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService, Toast, ToastType } from '../../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      @for (toast of toasts(); track toast.id) {
        <div
          [class]="getToastClasses(toast.type)"
          class="pointer-events-auto min-w-[320px] max-w-md shadow-lg rounded-lg p-4 flex items-start gap-3 animate-slide-in"
        >
          <div [class]="getIconClasses(toast.type)">
            <lucide-icon [name]="getIconName(toast.type)" class="h-5 w-5"></lucide-icon>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium" [class]="getTextClasses(toast.type)">
              {{ toast.message }}
            </p>
          </div>
          <button
            (click)="removeToast(toast.id)"
            class="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }
  `]
})
export class ToastComponent {
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  
  // expõe o signal readonly diretamente para o template
  readonly toasts = this.toastService.toasts;

  constructor() {
    // garante render imediato mesmo quando o primeiro toast é criado fora do CD atual
    effect(() => {
      this.toasts();
      queueMicrotask(() => this.cdr.detectChanges());
    });
  }

  getToastClasses(type: ToastType): string {
    const baseClasses = 'border';
    const typeClasses = {
      success: 'bg-green-50 border-green-200',
      error: 'bg-red-50 border-red-200',
      info: 'bg-blue-50 border-blue-200',
      warning: 'bg-yellow-50 border-yellow-200'
    };
    return `${baseClasses} ${typeClasses[type]}`;
  }

  getIconClasses(type: ToastType): string {
    const typeClasses = {
      success: 'text-green-600',
      error: 'text-red-600',
      info: 'text-blue-600',
      warning: 'text-yellow-600'
    };
    return `shrink-0 ${typeClasses[type]}`;
  }

  getTextClasses(type: ToastType): string {
    const typeClasses = {
      success: 'text-green-800',
      error: 'text-red-800',
      info: 'text-blue-800',
      warning: 'text-yellow-800'
    };
    return typeClasses[type];
  }

  getIconName(type: ToastType): string {
    const icons = {
      success: 'badge-check',
      error: 'alert-circle',
      info: 'info',
      warning: 'alert-triangle'
    };
    return icons[type];
  }

  removeToast(id: string): void {
    this.toastService.remove(id);
  }
}

