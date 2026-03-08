import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses">
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  @Input() variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' = 'default';
  @Input() customClass = '';

  private variants: Record<string, string> = {
    default: 'bg-[#155347] text-white',
    secondary: 'bg-[#e8f0ee] dark:bg-[#155347]/20 text-[#155347] dark:text-[#6ee7b7]',
    outline: 'border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-300',
    destructive: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
  };

  get badgeClasses(): string {
    const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
    return `${baseClasses} ${this.variants[this.variant]} ${this.customClass}`;
  }
}
