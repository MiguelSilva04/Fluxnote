import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <div class="w-full">
      @if (label) {
        <label [for]="inputId" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {{ label }}
        </label>
      }
      <div class="relative">
        @if (hasLeftIcon) {
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <ng-content select="[leftIcon]"></ng-content>
          </div>
        }
        <input
          [id]="inputId"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [readonly]="readonly"
          [required]="required"
          [class]="inputClasses"
          [(ngModel)]="value"
          (ngModelChange)="onInputChange($event)"
          (blur)="onTouched()"
        />
        @if (hasRightIcon) {
          <div class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <ng-content select="[rightIcon]"></ng-content>
          </div>
        }
      </div>
      @if (error) {
        <p class="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <lucide-icon name="badge-alert" class="h-4 w-4"></lucide-icon>
          {{ error }}
        </p>
      }
      @if (!error && success) {
        <p class="mt-1.5 text-sm text-green-600 flex items-center gap-1">
          <lucide-icon name="badge-check" class="h-4 w-4"></lucide-icon>
          Saved
        </p>
      }
      @if (!error && !success && helperText) {
        <p class="mt-1.5 text-sm text-gray-500">{{ helperText }}</p>
      }
    </div>
  `
})
export class InputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() error = '';
  @Input() success = false;
  @Input() helperText = '';
  @Input() hasLeftIcon = false;
  @Input() hasRightIcon = false;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  @Input() customClass = '';

  value = '';
  inputId = `input-${Math.random().toString(36).substr(2, 9)}`;

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  get inputClasses(): string {
    const baseClasses = 'flex h-10 w-full rounded-lg border bg-white dark:bg-gray-700 px-3 py-2 text-sm ring-offset-white dark:ring-offset-gray-900 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all';
    const paddingLeft = this.hasLeftIcon ? 'pl-10' : '';
    const paddingRight = this.hasRightIcon ? 'pr-10' : '';

    let stateClasses = 'border-gray-300 dark:border-gray-600 focus-visible:ring-[#155347] text-gray-900 dark:text-gray-100';
    if (this.error) {
      stateClasses = 'border-red-300 dark:border-red-600 focus-visible:ring-red-500 text-red-900 dark:text-red-400';
    } else if (this.success) {
      stateClasses = 'border-green-300 dark:border-green-600 focus-visible:ring-green-500 text-green-900 dark:text-green-400';
    }

    return `${baseClasses} ${paddingLeft} ${paddingRight} ${stateClasses} ${this.customClass}`;
  }

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(value: string): void {
    this.value = value;
    this.onChange(value);
  }
}
