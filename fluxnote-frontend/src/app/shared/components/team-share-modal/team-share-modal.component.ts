import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { ModalComponent } from '../ui';
import { TeamInviteDto } from '../../../core/models';

@Component({
  selector: 'app-team-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, TranslateModule],
  template: `
    <app-modal
      [isOpen]="isOpen"
      [title]="'SHARE_MODAL.CREATE_INVITE_LINK' | translate"
      maxWidth="md"
      (onClose)="close.emit()"
    >
      <div class="space-y-4">
        <!-- Tab Selector -->
        <div class="flex border-b border-gray-200 dark:border-gray-700">
          <button
            (click)="activeTab.set('link')"
            [class]="'px-4 py-2 text-sm font-medium border-b-2 transition-colors ' + (activeTab() === 'link' ? 'border-[#155347] text-[#155347] dark:text-emerald-400 dark:border-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300')"
          >
            <div class="flex items-center gap-2">
              <lucide-icon name="link" class="h-4 w-4"></lucide-icon>
              {{ 'SHARE_MODAL.INVITE_LINK' | translate }}
            </div>
          </button>
          <button
            (click)="activeTab.set('email')"
            [class]="'px-4 py-2 text-sm font-medium border-b-2 transition-colors ' + (activeTab() === 'email' ? 'border-[#155347] text-[#155347] dark:text-emerald-400 dark:border-emerald-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300')"
          >
            <div class="flex items-center gap-2">
              <lucide-icon name="mail" class="h-4 w-4"></lucide-icon>
              {{ 'SHARE_MODAL.INVITE_BY_EMAIL' | translate }}
            </div>
          </button>
        </div>

        <!-- Link Tab -->
        @if (activeTab() === 'link') {
          <!-- Expiration Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ 'SHARE_MODAL.EXPIRES_IN' | translate }}
            </label>
            <select
              [ngModel]="expirationDays"
              (ngModelChange)="expirationDaysChange.emit($event)"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-[#155347]">
              <option [ngValue]="1">{{ 'SHARE_MODAL.1_DAY' | translate }}</option>
              <option [ngValue]="3">{{ 'SHARE_MODAL.3_DAYS' | translate }}</option>
              <option [ngValue]="7">{{ 'SHARE_MODAL.7_DAYS' | translate }}</option>
              <option [ngValue]="14">{{ 'SHARE_MODAL.14_DAYS' | translate }}</option>
              <option [ngValue]="30">{{ 'SHARE_MODAL.30_DAYS' | translate }}</option>
            </select>
          </div>

          <!-- Generate Button -->
          <button
            (click)="generateInvite.emit()"
            [disabled]="loading"
            class="w-full px-4 py-2 text-sm font-medium text-white bg-[#155347] rounded-lg hover:bg-[#0e3d33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {{ loading ? ('SHARE_MODAL.GENERATING' | translate) : ('SHARE_MODAL.GENERATE_LINK' | translate) }}
          </button>

          <!-- Generated Link -->
          @if (generatedUrl) {
            <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {{ 'SHARE_MODAL.INVITE_LINK_LABEL' | translate }}
              </label>
              <div class="flex gap-2">
                <input
                  type="text"
                  [value]="generatedUrl"
                  readonly
                  class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 select-all">
                <button
                  (click)="copyInvite.emit()"
                  class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                  [class]="copied ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-300'">
                  {{ copied ? ('SHARE_MODAL.COPIED' | translate) : ('SHARE_MODAL.COPY' | translate) }}
                </button>
              </div>
            </div>
          }

          <!-- Active Invites List -->
          @if (invites.length > 0) {
            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ 'SHARE_MODAL.ACTIVE_INVITES' | translate }} ({{ invites.length }})
                </h4>
                <button
                  (click)="clearInvites.emit()"
                  class="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  {{ 'SHARE_MODAL.CLEAR_USED' | translate }}
                </button>
              </div>
              <div class="space-y-2">
                @for (inv of invites; track inv.id) {
                  <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                    <div>
                      <span class="text-gray-500 dark:text-gray-400 mx-1">&middot;</span>
                      <span class="text-gray-500 dark:text-gray-400">
                        {{ 'SHARE_MODAL.EXPIRES_ON' | translate }} {{ inv.expiresAt | date:'dd/MM/yyyy' }}
                      </span>
                      @if (inv.isUsed) {
                        <span class="text-gray-400 mx-1">&middot;</span>
                        <span class="text-orange-500">{{ 'SHARE_MODAL.USED' | translate }}</span>
                      }
                    </div>
                    <div class="flex items-center gap-2">
                      @if (!inv.isUsed) {
                        <button
                          (click)="viewInvite.emit(inv.inviteUrl)"
                          class="text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                          {{ 'SHARE_MODAL.VIEW_LINK' | translate }}
                        </button>
                        <button
                          (click)="revokeInvite.emit(inv.id)"
                          class="text-red-500 hover:text-red-700 text-xs font-medium">
                          {{ 'SHARE_MODAL.REVOKE' | translate }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }

        <!-- Email Tab -->
        @if (activeTab() === 'email') {
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ 'SHARE_MODAL.EMAIL_LABEL' | translate }}
            </label>
            <div class="flex gap-2">
              <input
                type="email"
                [(ngModel)]="emailInput"
                [placeholder]="'SHARE_MODAL.EMAIL_PLACEHOLDER' | translate"
                class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#155347]"
                (keydown.enter)="sendEmailInvite()">
              <button
                (click)="sendEmailInvite()"
                [disabled]="emailLoading || !emailInput.trim()"
                class="px-4 py-2 text-sm font-medium text-white bg-[#155347] rounded-lg hover:bg-[#0e3d33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {{ emailLoading ? ('SHARE_MODAL.SENDING' | translate) : ('SHARE_MODAL.SEND' | translate) }}
              </button>
            </div>
          </div>

          @if (emailMessage) {
            <div [class]="'p-3 rounded-lg text-sm ' + (emailShouldUseLink ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300')">
              <div class="flex items-start gap-2">
                <lucide-icon [name]="emailShouldUseLink ? 'circle-x' : 'circle-check'" class="h-4 w-4 mt-0.5 shrink-0"></lucide-icon>
                <span>{{ emailMessage }}</span>
              </div>
            </div>
          }
        }
      </div>
    </app-modal>
  `
})
export class TeamShareModalComponent {
  @Input() isOpen = false;
  @Input() expirationDays = 7;
  @Input() generatedUrl: string | null = null;
  @Input() loading = false;
  @Input() copied = false;
  @Input() invites: TeamInviteDto[] = [];
  @Input() emailLoading = false;
  @Input() emailMessage: string | null = null;
  @Input() emailShouldUseLink = false;

  @Output() close = new EventEmitter<void>();
  @Output() expirationDaysChange = new EventEmitter<number>();
  @Output() generateInvite = new EventEmitter<void>();
  @Output() copyInvite = new EventEmitter<void>();
  @Output() revokeInvite = new EventEmitter<number>();
  @Output() clearInvites = new EventEmitter<void>();
  @Output() viewInvite = new EventEmitter<string>();
  @Output() emailInvite = new EventEmitter<string>();

  activeTab = signal<'link' | 'email'>('link');
  emailInput = '';

  sendEmailInvite(): void {
    if (!this.emailInput.trim()) return;
    this.emailInvite.emit(this.emailInput.trim());
    this.emailInput = '';
  }
}
