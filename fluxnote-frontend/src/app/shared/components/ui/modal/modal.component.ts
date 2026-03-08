import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in">
        <div
          [class]="modalClasses"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'modal-title-' + modalId"
        >
          <div class="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 [id]="'modal-title-' + modalId" class="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {{ title }}
            </h2>
            <button
              (click)="close()"
              class="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close modal"
            >
              <lucide-icon name="x" class="h-5 w-5"></lucide-icon>
            </button>
          </div>

          <div class="p-6 overflow-y-auto">
            <ng-content></ng-content>
          </div>

          @if (hasFooter) {
            <div class="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-b-xl flex justify-end gap-3">
              <ng-content select="[footer]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() maxWidth: 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'md';
  @Input() hasFooter = false;
  @Output() onClose = new EventEmitter<void>();

  modalId = Math.random().toString(36).substr(2, 9);

  private maxWidths: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  get modalClasses(): string {
    return `bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full ${this.maxWidths[this.maxWidth]} flex flex-col max-h-[90vh]`;
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  close(): void {
    this.onClose.emit();
  }
}
