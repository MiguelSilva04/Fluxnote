import { Component, inject, signal, ViewChild, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent, BadgeComponent, WorkInProgressComponent } from '../../shared/components/ui';
import { DocumentService } from '../../core/services';
import { Collaborator, Version, Comment, AISuggestion } from '../../core/models';
import { TextEditorComponent } from './components/text-editor.component';

// TODO: BACKEND INTEGRATION - Adicionar import do HttpClient quando necessário
// import { HttpClient } from '@angular/common/http';
// import { Observable, catchError, of } from 'rxjs';

@Component({
  selector: 'app-document-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ButtonComponent,
    BadgeComponent,
    TextEditorComponent,
    WorkInProgressComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col relative">
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center h-screen gap-4">
          <lucide-icon name="loader-circle" class="h-10 w-10 text-[#155347] animate-spin"></lucide-icon>
          <div class="text-gray-500 text-sm">Loading document...</div>
        </div>
      } @else if (loadError()) {
        <div class="flex flex-col items-center justify-center h-screen gap-4">
          <lucide-icon name="alert-circle" class="h-10 w-10 text-red-500"></lucide-icon>
          <div class="text-red-600 text-sm">{{ loadError() }}</div>
          <div class="text-gray-500 text-xs">Redirecting to dashboard...</div>
        </div>
      } @else {
        <!-- Header -->
        <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-4">
            <button (click)="navigateBack()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <lucide-icon name="arrow-left" class="h-5 w-5 text-gray-600"></lucide-icon>
          </button>
          <div class="flex-1">
            <!-- Editable Title -->
            @if (isEditingTitle()) {
              <input
                #titleInput
                type="text"
                [(ngModel)]="documentTitle"
                (blur)="saveTitle()"
                (keydown.enter)="saveTitle()"
                (keydown.escape)="cancelTitleEdit()"
                class="text-lg font-bold text-gray-900 bg-transparent border-b-2 border-[#155347] focus:outline-none w-full max-w-md"
              />
            } @else {
              <h1
                (click)="startEditingTitle()"
                class="text-lg font-bold text-gray-900 cursor-pointer hover:text-[#155347] transition-colors"
                title="Click to edit title"
              >
                {{ documentTitle }}
              </h1>
            }
            <p class="text-xs text-gray-500">{{ lastEditedText() }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <app-button variant="outline" size="sm" [leftIcon]="true" (onClick)="showWipModal.set(true)">
            <lucide-icon leftIcon name="sparkles" class="h-4 w-4"></lucide-icon>
            AI Assistant
          </app-button>
          <app-button variant="outline" size="sm" [leftIcon]="true" (onClick)="showWipModal.set(true)">
            <lucide-icon leftIcon name="clock" class="h-4 w-4"></lucide-icon>
            History
          </app-button>
          <app-button variant="outline" size="sm" [leftIcon]="true" (onClick)="showWipModal.set(true)">
            <lucide-icon leftIcon name="message-square" class="h-4 w-4"></lucide-icon>
            Comments
          </app-button>
          <app-button variant="outline" size="sm" [leftIcon]="true" (onClick)="showWipModal.set(true)">
            <lucide-icon leftIcon name="share-2" class="h-4 w-4"></lucide-icon>
            Share
          </app-button>
          <button class="p-2 hover:bg-gray-100 rounded-lg">
            <lucide-icon name="ellipsis-vertical" class="h-5 w-5 text-gray-600"></lucide-icon>
          </button>
        </div>
      </header>

      <div class="flex flex-1 overflow-hidden">
        <!-- Main Editor -->
        <main class="flex-1 flex flex-col overflow-hidden">
          <app-rich-text-editor
            #editor
            [initialContent]="initialContent"
            placeholder="Start writing your document..."
            [autoSaveDelay]="2000"
            (contentChange)="onContentChange($event)"
            (save)="onSave($event)"
          />
        </main>

        <!-- AI Assistant Panel -->
        @if (showAIPanel()) {
          <aside class="w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 class="text-lg font-bold text-gray-900">AI Assistant</h3>
              <button (click)="showAIPanel.set(false)" class="p-1 hover:bg-gray-100 rounded">
                <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-6">
              <div class="mb-6">
                <h4 class="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
                <div class="space-y-2">
                  @for (suggestion of aiSuggestions; track suggestion.id) {
                    <button
                      (click)="handleAIAction(suggestion.id)"
                      [disabled]="aiGenerating()"
                      class="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div class="flex items-start gap-3">
                        <span class="text-2xl">{{ suggestion.icon }}</span>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-gray-900 mb-1">{{ suggestion.title }}</p>
                          <p class="text-xs text-gray-500">{{ suggestion.description }}</p>
                        </div>
                      </div>
                    </button>
                  }
                </div>
              </div>

              @if (aiGenerating()) {
                <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                  <div class="flex items-center gap-3">
                    <lucide-icon name="loader-circle" class="h-5 w-5 text-blue-600 animate-spin"></lucide-icon>
                    <p class="text-sm text-blue-900">Generating suggestion...</p>
                  </div>
                </div>
              }

              <div class="mb-6">
                <h4 class="text-sm font-semibold text-gray-900 mb-3">AI Suggestions</h4>
                <div class="space-y-3">
                  <div class="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p class="text-xs font-medium text-green-900 mb-1">Original:</p>
                    <p class="text-xs text-green-800 mb-2">The data shows an increase.</p>
                    <p class="text-xs font-medium text-green-900 mb-1">Suggestion:</p>
                    <p class="text-xs text-green-800 mb-3">
                      The analysis reveals a substantial 15% growth, indicating positive market trends.
                    </p>
                    <div class="flex gap-2">
                      <app-button size="sm" customClass="text-xs h-7 bg-green-600 hover:bg-green-700">Accept</app-button>
                      <app-button size="sm" variant="outline" customClass="text-xs h-7">Reject</app-button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="p-4 bg-gray-50 rounded-lg mb-4">
                <p class="text-xs text-gray-600 mb-2">AI Credits Remaining:</p>
                <div class="flex items-center justify-between">
                  <div class="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                    <div class="bg-[#155347] h-2 rounded-full" style="width: 75%"></div>
                  </div>
                  <span class="text-xs font-bold text-gray-900">15/20</span>
                </div>
              </div>

              <app-button
                variant="outline"
                customClass="w-full border-2 border-dashed border-gray-300 hover:border-[#155347] hover:bg-[#e8f0ee]"
                [leftIcon]="true"
              >
                <lucide-icon leftIcon name="upload" class="h-4 w-4"></lucide-icon>
                Upload Context
              </app-button>
              <p class="text-xs text-gray-500 text-center mt-2">
                Upload documents to provide additional context for AI
              </p>
            </div>
          </aside>
        }

        <!-- Version History Sidebar -->
        @if (showVersionHistory()) {
          <aside class="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 class="text-lg font-bold text-gray-900">Version History</h3>
              <button (click)="showVersionHistory.set(false)" class="p-1 hover:bg-gray-100 rounded">
                <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4">
              @if (selectedVersions().length === 2) {
                <div class="mb-4">
                  <app-button (onClick)="handleCompareVersions()" customClass="w-full bg-[#155347] hover:bg-[#0d3d31]">
                    Compare Selected Versions
                  </app-button>
                </div>
              }

              <div class="space-y-4">
                @for (version of versions; track version.id) {
                  <div
                    [class]="'p-4 border-2 rounded-lg transition-colors ' + (selectedVersions().includes(version.id) ? 'border-[#155347] bg-[#e8f0ee]' : 'border-gray-200 hover:border-gray-300')"
                  >
                    <div class="flex items-start justify-between mb-2">
                      <div>
                        <h4 class="text-sm font-bold text-gray-900">Version {{ version.number }}</h4>
                        <p class="text-xs text-gray-500">{{ version.timestamp }}</p>
                      </div>
                      <input
                        type="checkbox"
                        [checked]="selectedVersions().includes(version.id)"
                        (change)="handleVersionSelect(version.id)"
                        class="rounded border-gray-300 text-[#155347] focus:ring-[#155347]"
                      />
                    </div>
                    <p class="text-xs font-medium text-gray-900 mb-1">{{ version.author }}:</p>
                    <p class="text-xs text-gray-700 mb-3">{{ version.description }}</p>
                    <div class="flex gap-2">
                      <app-button variant="outline" size="sm" [leftIcon]="true" (onClick)="handleRestore(version.number)">
                        <lucide-icon leftIcon name="rotate-ccw" class="h-3 w-3"></lucide-icon>
                        Restore
                      </app-button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </aside>
        }

        <!-- Comments Sidebar -->
        @if (showComments()) {
          <aside class="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-gray-900">Comments</h3>
                <app-badge customClass="bg-red-500 text-white">2</app-badge>
              </div>
              <button (click)="showComments.set(false)" class="p-1 hover:bg-gray-100 rounded">
                <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
              </button>
            </div>

            <div class="p-4 border-b border-gray-200">
              <textarea
                placeholder="Add a comment..."
                [(ngModel)]="newComment"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm resize-none"
                rows="3"
              ></textarea>
              <div class="mt-2 flex justify-end">
                <app-button size="sm" customClass="bg-[#155347] hover:bg-[#0d3d31]" [leftIcon]="true">
                  <lucide-icon leftIcon name="send" class="h-3 w-3"></lucide-icon>
                  Post
                </app-button>
              </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              @for (comment of comments; track comment.id) {
                <div class="space-y-2">
                  <div class="flex gap-3">
                    <div
                      [class]="'h-8 w-8 rounded-full text-white flex items-center justify-center text-xs font-medium shrink-0 ' + comment.color"
                    >
                      {{ comment.avatar }}
                    </div>
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-medium text-gray-900">{{ comment.author }}</span>
                        <span class="text-xs text-gray-500">{{ comment.time }}</span>
                      </div>
                      <p class="text-sm text-gray-700">{{ comment.text }}</p>
                      <button class="text-xs text-gray-500 hover:text-[#155347] mt-2">Reply</button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </aside>
        }
      </div>

      <!-- Share Modal -->
      @if (showShareModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-900">Share Document</h2>
              <button (click)="showShareModal.set(false)" class="p-1 hover:bg-gray-100 rounded">
                <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
              </button>
            </div>

            <div class="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <!-- Invite People -->
              <div>
                <h3 class="text-sm font-semibold text-gray-900 mb-3">Invite People</h3>
                <div class="flex gap-2">
                  <div class="flex-1 relative">
                    <lucide-icon name="mail" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
                    <input
                      type="text"
                      placeholder="Enter email addresses"
                      class="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                    />
                  </div>
                  <select class="h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white">
                    <option>Editor</option>
                    <option>Viewer</option>
                  </select>
                  <app-button customClass="bg-[#155347] hover:bg-[#0d3d31]">Add</app-button>
                </div>
              </div>

              <!-- Shareable Link -->
              <div>
                <h3 class="text-sm font-semibold text-gray-900 mb-3">Shareable Link</h3>
                <div class="flex gap-2">
                  <div class="flex-1 relative">
                    <lucide-icon name="globe" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
                    <input
                      type="text"
                      value="https://fluxnote.app/docs/doc-123456789/share"
                      readonly
                      class="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 bg-gray-50 text-sm"
                    />
                  </div>
                  <app-button variant="outline" [leftIcon]="true">
                    <lucide-icon leftIcon name="copy" class="h-4 w-4"></lucide-icon>
                    Copy
                  </app-button>
                </div>
              </div>

              <!-- People with Access -->
              <div>
                <h3 class="text-sm font-semibold text-gray-900 mb-3">People with Access</h3>
                <div class="space-y-2">
                  <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div class="flex items-center gap-3">
                      <div class="h-8 w-8 rounded-full bg-[#155347] text-white flex items-center justify-center text-xs font-medium">
                        AM
                      </div>
                      <div>
                        <p class="text-sm font-medium text-gray-900">Alex Morgan (You)</p>
                        <p class="text-xs text-gray-500">alex.morgan&#64;fluxnote.com</p>
                      </div>
                    </div>
                    <span class="text-sm text-gray-500">Owner</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <app-button (onClick)="showShareModal.set(false)" customClass="bg-[#155347] hover:bg-[#0d3d31]">
                Done
              </app-button>
            </div>
          </div>
        </div>
      }

      <!-- Restore Version Modal -->
      @if (isRestoreModalOpen()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-900">Restore Old Version</h2>
              <button (click)="closeRestoreModal()" class="text-gray-400 hover:text-gray-600 p-1">
                <lucide-icon name="x" class="h-5 w-5"></lucide-icon>
              </button>
            </div>

            <div class="p-6 space-y-4">
              <div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <lucide-icon name="triangle-alert" class="h-5 w-5 text-red-600 shrink-0 mt-0.5"></lucide-icon>
                <p class="text-sm text-red-800 font-medium">
                  This action will replace the current version of the document with the selected version.
                </p>
              </div>

              <p class="text-sm text-gray-600">
                This action cannot be undone. Make sure you want to continue.
              </p>

              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="restoreConfirmed"
                  class="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span class="text-sm text-gray-700">I understand that this action is irreversible.</span>
              </label>
            </div>

            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
              <app-button variant="ghost" (onClick)="closeRestoreModal()">Cancel</app-button>
              <app-button
                (onClick)="confirmRestore()"
                [disabled]="!restoreConfirmed"
                customClass="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Restore and Replace
              </app-button>
            </div>
          </div>
        </div>
      }
      } <!-- End of @else (loading) -->

      <!-- Work in Progress Modal -->
      <app-work-in-progress [show]="showWipModal()" (close)="showWipModal.set(false)" />
    </div>
  `,
})
export class DocumentEditorComponent implements OnInit {
  @ViewChild('editor') editor!: TextEditorComponent;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private documentService = inject(DocumentService);
  private location = inject(Location);
  
  // ID do documento atual
  documentId: number | null = null;
  
  // Estado de carregamento
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  showVersionHistory = signal(false);
  showComments = signal(false);
  showShareModal = signal(false);
  showAIPanel = signal(false);
  showWipModal = signal(false);
  isRestoreModalOpen = signal(false);
  versionToRestore = signal<number | null>(null);
  newComment = '';
  selectedVersions = signal<number[]>([]);
  aiGenerating = signal(false);
  restoreConfirmed = false;

  // Document state
  documentTitle = '';
  originalTitle = '';
  isEditingTitle = signal(false);
  lastEdited = signal(new Date());

  // Conteúdo inicial do editor (carregado do backend)
  initialContent = '';

  // TODO: Implementar colaboração em tempo real
  collaborators: Collaborator[] = [];

  versions: Version[] = this.documentService.getVersions();
  comments: Comment[] = this.documentService.getComments();
  aiSuggestions: AISuggestion[] = this.documentService.getAISuggestions();

  lastEditedText = signal('Last edited just now');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.documentId = +id;
      this.loadDocument(this.documentId);
    } else {
      // Redirecionar para dashboard se não houver ID
      this.router.navigate(['/dashboard']);
    }
  }

  private loadDocument(id: number): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.documentService.getDocument(id).subscribe({
      next: (doc) => {
        this.documentTitle = doc.title;
        this.originalTitle = doc.title;
        this.initialContent = doc.content || '';
        this.lastEdited.set(new Date(doc.updatedAt));
        this.lastEditedText.set(this.formatLastEdited(new Date(doc.updatedAt)));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading document:', err);
        this.loadError.set(err.error?.message || 'Error loading document');
        this.isLoading.set(false);
        // Redirecionar para dashboard após delay
        setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      }
    });
  }

  private formatLastEdited(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Last edited just now';
    if (diffMins < 60) return `Last edited ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `Last edited ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Last edited yesterday';
    return `Last edited ${diffDays} days ago`;
  }

  startEditingTitle(): void {
    this.originalTitle = this.documentTitle;
    this.isEditingTitle.set(true);
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  saveTitle(): void {
    if (this.documentTitle.trim() === '') {
      this.documentTitle = this.originalTitle;
    }
    this.isEditingTitle.set(false);
    
    // Guardar título no backend
    if (this.documentId && this.documentTitle !== this.originalTitle) {
      this.documentService.updateDocument(this.documentId, {
        title: this.documentTitle
      }).subscribe({
        next: () => {
          this.originalTitle = this.documentTitle;
          this.updateLastEdited();
        },
        error: (err) => {
          console.error('Error saving title:', err);
          // Reverter título em caso de erro
          this.documentTitle = this.originalTitle;
        }
      });
    }
  }

  cancelTitleEdit(): void {
    this.documentTitle = this.originalTitle;
    this.isEditingTitle.set(false);
  }

  private updateLastEdited(): void {
    this.lastEdited.set(new Date());
    this.lastEditedText.set('Last edited just now');
  }

  onContentChange(content: string): void {
    // Função que é chamada quando o conteúdo do editor muda,
    // fica aqui para se for preciso fazer algo em tempo real
  }

  onSave(content: string): void {
    if (!this.documentId) {
      console.warn('Cannot save: Document ID is missing');
      this.editor.setSaveStatus('error');
      return;
    }

    this.documentService.updateDocument(this.documentId, { content }).subscribe({
      next: () => {
        this.editor.setSaveStatus('saved');
        this.updateLastEdited();
      },
      error: (err) => {
        console.error('Error saving document:', err);
        this.editor.setSaveStatus('error');
      }
    });
  }

  navigateBack(): void {
    this.location.back();
  }

  toggleAIPanel(): void {
    this.showAIPanel.update((v) => !v);
    this.showVersionHistory.set(false);
    this.showComments.set(false);
  }

  toggleVersionHistory(): void {
    this.showVersionHistory.update((v) => !v);
    this.showComments.set(false);
    this.showAIPanel.set(false);
  }

  toggleComments(): void {
    this.showComments.update((v) => !v);
    this.showVersionHistory.set(false);
    this.showAIPanel.set(false);
  }

  handleVersionSelect(versionId: number): void {
    const current = this.selectedVersions();
    if (current.includes(versionId)) {
      this.selectedVersions.set(current.filter((id) => id !== versionId));
    } else if (current.length < 2) {
      this.selectedVersions.set([...current, versionId]);
    }
  }

  handleCompareVersions(): void {
    if (this.selectedVersions().length === 2) {
      this.router.navigate(['/version-history']);
    }
  }

  handleRestore(versionNumber: number): void {
    this.versionToRestore.set(versionNumber);
    this.isRestoreModalOpen.set(true);
  }

  closeRestoreModal(): void {
    this.isRestoreModalOpen.set(false);
    this.restoreConfirmed = false;
  }

  confirmRestore(): void {
    if (this.restoreConfirmed) {
      this.closeRestoreModal();
      // Handle restore logic
    }
  }

  handleAIAction(actionId: number): void {
    this.aiGenerating.set(true);
    setTimeout(() => this.aiGenerating.set(false), 2000);
  }
}
