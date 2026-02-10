import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent, ModalComponent } from '../ui';
import { DocumentInviteDto } from '../../../core/models';

@Component({
  selector: 'app-document-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent, ModalComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      title="Partilhar Documento"
      maxWidth="md"
      (onClose)="close.emit()"
    >
      <div class="space-y-4">
        <!-- Role Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Permissao a atribuir
          </label>
          <select
            [ngModel]="role"
            (ngModelChange)="roleChange.emit($event)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-[#155347]">
            <option [ngValue]="0">Viewer (apenas leitura)</option>
            <option [ngValue]="1">Editor (leitura e escrita)</option>
          </select>
        </div>

        <!-- Expiration Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Expira em
          </label>
          <select
            [ngModel]="expirationDays"
            (ngModelChange)="expirationDaysChange.emit($event)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-[#155347]">
            <option [ngValue]="1">1 dia</option>
            <option [ngValue]="3">3 dias</option>
            <option [ngValue]="7">7 dias</option>
            <option [ngValue]="14">14 dias</option>
            <option [ngValue]="30">30 dias</option>
          </select>
        </div>

        <!-- Generate Button -->
        <button
          (click)="generateInvite.emit()"
          [disabled]="loading"
          class="w-full px-4 py-2 text-sm font-medium text-white bg-[#155347] rounded-lg hover:bg-[#0e3d33] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {{ loading ? 'A gerar...' : 'Gerar Link de Convite' }}
        </button>

        <!-- Generated Link -->
        @if (generatedUrl) {
          <div class="p-3 bg-gray-50 rounded-lg">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Link de Convite
            </label>
            <div class="flex gap-2">
              <input
                type="text"
                [value]="generatedUrl"
                readonly
                class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 select-all">
              <button
                (click)="copyInvite.emit()"
                class="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                [class]="copied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'">
                {{ copied ? 'Copiado!' : 'Copiar' }}
              </button>
            </div>
          </div>
        }

        <!-- Active Invites List -->
        @if (invites && invites!.length > 0) {
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-medium text-gray-700">
                Convites Ativos ({{ invites.length }})
              </h4>
              <button
                (click)="clearInvites.emit()"
                class="text-xs font-medium text-gray-500 hover:text-gray-700">
                Clear used
              </button>
            </div>
            <div class="space-y-2">
              @for (inv of invites; track inv.id) {
                <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <span class="font-medium">{{ inv.role === 1 ? 'Editor' : 'Viewer' }}</span>
                    <span class="text-gray-500 mx-1">&middot;</span>
                    <span class="text-gray-500">
                      expira {{ inv.expiresAt | date:'dd/MM/yyyy' }}
                    </span>
                    @if (inv.isUsed) {
                      <span class="text-gray-400 mx-1">&middot;</span>
                      <span class="text-orange-500">Usado</span>
                    }
                  </div>
                  <div class="flex items-center gap-2">
                    @if (!inv.isUsed) {
                      <button
                        (click)="viewInvite.emit(inv.inviteUrl)"
                        class="text-xs font-medium text-gray-700 hover:text-gray-900">
                        View link
                      </button>
                      <button
                        (click)="revokeInvite.emit(inv.id)"
                        class="text-red-500 hover:text-red-700 text-xs font-medium">
                        Revogar
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </app-modal>
  `
})
export class DocumentShareModalComponent {
  @Input() isOpen = false;
  @Input() role = 0;
  @Input() expirationDays = 7;
  @Input() generatedUrl: string | null = null;
  @Input() loading = false;
  @Input() copied = false;
  @Input() invites: DocumentInviteDto[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() roleChange = new EventEmitter<number>();
  @Output() expirationDaysChange = new EventEmitter<number>();
  @Output() generateInvite = new EventEmitter<void>();
  @Output() copyInvite = new EventEmitter<void>();
  @Output() revokeInvite = new EventEmitter<number>();
  @Output() clearInvites = new EventEmitter<void>();
  @Output() viewInvite = new EventEmitter<string>();
}
