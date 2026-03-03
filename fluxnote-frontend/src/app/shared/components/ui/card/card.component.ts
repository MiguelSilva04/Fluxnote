import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="cardClasses"
      (click)="hoverable ? null : undefined"
    >
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent {
  @Input() customClass = '';
  @Input() hoverable = false;

  get cardClasses(): string {
    const baseClasses = 'bg-white rounded-xl border border-gray-200 shadow-sm';
    const hoverClasses = this.hoverable ? 'transition-shadow hover:shadow-md cursor-pointer' : '';
    return `${baseClasses} ${hoverClasses} ${this.customClass}`;
  }
}

@Component({
  selector: 'app-card-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'p-6 border-b border-gray-100 ' + customClass">
      <ng-content></ng-content>
    </div>
  `
})
export class CardHeaderComponent {
  @Input() customClass = '';
}

@Component({
  selector: 'app-card-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'p-6 ' + customClass">
      <ng-content></ng-content>
    </div>
  `
})
export class CardContentComponent {
  @Input() customClass = '';
}

@Component({
  selector: 'app-card-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="'p-6 bg-gray-50 border-t border-gray-100 ' + customClass">
      <ng-content></ng-content>
    </div>
  `
})
export class CardFooterComponent {
  @Input() customClass = '';
}
