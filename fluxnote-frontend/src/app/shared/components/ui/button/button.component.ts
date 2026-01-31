import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Loader2 } from 'lucide-angular';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || isLoading"
      [class]="buttonClasses"
      (click)="onClick.emit($event)"
    >
      @if (isLoading) {
        <lucide-icon name="loader-circle" class="mr-2 h-4 w-4 animate-spin"></lucide-icon>
      }
      @if (!isLoading && leftIcon) {
        <span class="mr-2">
          <ng-content select="[leftIcon]"></ng-content>
        </span>
      }
      <ng-content></ng-content>
      @if (!isLoading && rightIcon) {
        <span class="ml-2">
          <ng-content select="[rightIcon]"></ng-content>
        </span>
      }
    </button>
  `
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' | 'icon' = 'md';
  @Input() isLoading = false;
  @Input() disabled = false;
  @Input() leftIcon = false;
  @Input() rightIcon = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() customClass = '';
  @Output() onClick = new EventEmitter<MouseEvent>();

  get buttonClasses(): string {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-lg';

    const variants: Record<string, string> = {
      primary: 'bg-[#155347] text-white hover:bg-[#0d3d31] focus:ring-[#155347]',
      secondary: 'bg-[#e8f0ee] text-[#155347] hover:bg-[#d1e0dd] focus:ring-[#155347]',
      ghost: 'hover:bg-gray-100 text-gray-700 focus:ring-gray-500',
      destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700 focus:ring-[#155347]'
    };

    const sizes: Record<string, string> = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 py-2 text-sm',
      lg: 'h-12 px-6 text-base',
      icon: 'h-10 w-10'
    };

    return `${baseStyles} ${variants[this.variant]} ${sizes[this.size]} ${this.customClass}`;
  }
}
