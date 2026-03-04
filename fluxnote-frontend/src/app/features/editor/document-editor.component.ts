import { Component, inject, signal, ViewChild, ElementRef, OnInit, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  ButtonComponent,
  BadgeComponent,
  WorkInProgressComponent,
} from '../../shared/components/ui';
import { DocumentShareModalComponent } from '../../shared/components/document-share-modal/document-share-modal.component';
import { DocumentService, DocumentInviteService, CollaborationService } from '../../core/services';
import { Collaborator, Version, Comment, AISuggestion, DocumentInviteDto, DocumentContextDto } from '../../core/models';
import { TextEditorComponent } from './components/text-editor.component';

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
    DocumentShareModalComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col relative">
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center h-screen gap-4">
          <lucide-icon
            name="loader-circle"
            class="h-10 w-10 text-[#155347] animate-spin"
          ></lucide-icon>
          <div class="text-gray-500 text-sm">Loading document...</div>
        </div>
      } @else if (loadError()) {
        <div class="flex flex-col items-center justify-center h-screen gap-4">
          <lucide-icon name="circle-alert" class="h-10 w-10 text-red-500"></lucide-icon>
          <div class="text-red-600 text-sm">{{ loadError() }}</div>
          <div class="text-gray-500 text-xs">Redirecting to dashboard...</div>
        </div>
      } @else {
        <!-- Header -->
        <header
          class="bg-white border-b border-gray-200 px-3 md:px-6 py-2 md:py-4 flex items-center justify-between gap-2 shrink-0"
        >
          <div class="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <button
              (click)="navigateBack()"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
                <lucide-icon name="arrow-left" class="h-5 w-5 text-gray-600"></lucide-icon>
              </button>
              <div class="min-w-0 flex-1">
                <!-- Editable Title -->
                @if (canEdit()) {
                  @if (isEditingTitle()) {
                    <input
                      #titleInput
                      type="text"
                      [(ngModel)]="documentTitle"
                      (blur)="saveTitle()"
                      (keydown.enter)="saveTitle()"
                      (keydown.escape)="cancelTitleEdit()"
                      class="text-base md:text-lg font-bold text-gray-900 bg-transparent border-b-2 border-[#155347] focus:outline-none w-full max-w-md"
                    />
                  } @else {
                    <h1
                      (click)="startEditingTitle()"
                      class="text-base md:text-lg font-bold text-gray-900 cursor-pointer hover:text-[#155347] transition-colors truncate"
                      title="Click to edit title"
                    >
                      {{ documentTitle }}
                    </h1>
                  }
                } @else {
                  <h1 class="text-base md:text-lg font-bold text-gray-900 truncate">
                    {{ documentTitle }}
                  </h1>
                }
                <div class="flex items-center gap-2">
                  <p class="text-xs text-gray-500 hidden sm:block">{{ lastEditedText() }}</p>
                  @if (!canEdit()) {
                    <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"
                  >
                      <lucide-icon name="eye" class="h-3 w-3"></lucide-icon>
                      <span class="hidden sm:inline">View only</span>
                    </span>
                  }
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 md:gap-2 flex-shrink-0">
            @if (canEdit()) {
              <app-button variant="outline" size="sm" [leftIcon]="true" (onClick)="toggleAIPanel()" customClass="hidden md:inline-flex">
                <lucide-icon leftIcon name="sparkles" class="h-4 w-4"></lucide-icon>
                AI Assistance
              </app-button>
              <app-button
                variant="outline"
                size="sm"
                [leftIcon]="true"
                (onClick)="showWipModal.set(true)" customClass="hidden md:inline-flex"
              >
                <lucide-icon leftIcon name="clock" class="h-4 w-4"></lucide-icon>
                History
              </app-button>
              <app-button
                variant="outline"
                size="sm"
                [leftIcon]="true"
                (onClick)="showWipModal.set(true)" customClass="hidden md:inline-flex"
              >
                <lucide-icon leftIcon name="message-square" class="h-4 w-4"></lucide-icon>
                Comments
              </app-button>
            }
            @if (pendingInvites().length > 0) {
              <div class="relative">
                <button
                  (click)="toggleInvitesPanel()"
                  class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  title="Pending invites"
                >
                  <lucide-icon name="user-plus" class="h-3.5 w-3.5 text-gray-600"></lucide-icon>
                  Invites
                  <span
                    class="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[#155347] text-white text-[10px]"
                  >
                    {{ pendingInvites().length }}
                  </span>
                </button>
                @if (showInvitesPanel()) {
                  <div
                    class="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10"
                  >
                    <div class="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                      Pending invites
                    </div>
                    <div class="divide-y divide-gray-100">
                      @for (inv of pendingInvites(); track inv.id) {
                        <div class="px-3 py-2 text-sm flex items-center justify-between">
                          <div>
                            <div class="font-medium text-gray-900">
                              {{ inv.role === 1 ? 'Editor' : 'Viewer' }} invite
                            </div>
                            <div class="text-xs text-gray-500">
                              Expires {{ inv.expiresAt | date: 'MMM d, y' }}
                            </div>
                          </div>
                          <button
                            (click)="copyInviteUrl(inv.id, inv.inviteUrl)"
                            class="text-xs font-medium text-gray-700 hover:text-gray-900"
                          >
                            {{ lastCopiedInviteId() === inv.id ? 'Copied!' : 'Copy link' }}
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
            @if (canEdit()) {
              <app-button
                variant="outline"
                size="sm"
                [leftIcon]="true"
                (onClick)="openShareModal()"
                customClass="hidden md:inline-flex"
              >
                <lucide-icon leftIcon name="share-2" class="h-4 w-4"></lucide-icon>
                Share
              </app-button>
              <!-- Mobile 3-dots menu -->
              <div class="relative md:hidden">
                <button
                  (click)="showMobileMenu.set(!showMobileMenu())"
                  class="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <lucide-icon name="ellipsis-vertical" class="h-5 w-5 text-gray-600"></lucide-icon>
                </button>
                @if (showMobileMenu()) {
                  <div class="fixed inset-0 z-10" (click)="showMobileMenu.set(false)"></div>
                  <div class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                    <button
                      (click)="toggleAIPanel(); showMobileMenu.set(false)"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <lucide-icon name="sparkles" class="h-4 w-4 shrink-0"></lucide-icon>
                      AI Assistance
                    </button>
                    <button
                      (click)="showWipModal.set(true); showMobileMenu.set(false)"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <lucide-icon name="clock" class="h-4 w-4 shrink-0"></lucide-icon>
                      History
                    </button>
                    <button
                      (click)="showWipModal.set(true); showMobileMenu.set(false)"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <lucide-icon name="message-square" class="h-4 w-4 shrink-0"></lucide-icon>
                      Comments
                    </button>
                    <div class="border-t border-gray-100 my-1"></div>
                    <button
                      (click)="openShareModal(); showMobileMenu.set(false)"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <lucide-icon name="share-2" class="h-4 w-4 shrink-0"></lucide-icon>
                      Share
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </header>

        <div class="flex flex-1 overflow-hidden">
          <!-- Main Editor -->
          <main class="flex-1 flex flex-col overflow-hidden">
            <app-rich-text-editor
              #editor
              [initialContent]="initialContent"
              [documentId]="documentId"
              placeholder="Start writing your document..."
              [autoSaveDelay]="2000"
              [editable]="canEdit()"
              (contentChange)="onContentChange($event)"
              (save)="onSave($event)"
              (selectionChange)="onSelectionChange($event)"
              (generateButtonClick)="onGenerateButtonClick($event)"
            />

            <!-- Improve Text Tooltip (appears on text selection) -->
            @if (showImproveTooltip() && canEdit()) {
              <div
                class="fixed z-50 flex items-center gap-1 bg-gray-900 text-white rounded-lg shadow-xl px-2 py-1.5 animate-in fade-in"
                [style.top.px]="improveTooltipPosition().top"
                [style.left.px]="improveTooltipPosition().left"
              >
                <button
                  (mousedown)="requestImproveText($event)"
                  class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/20 transition-colors text-xs font-medium"
                >
                  <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-purple-300"></lucide-icon>
                  Improve with AI
                </button>
              </div>
            }


          </main>

          <!-- AI Assistant Panel -->
          @if (showAIPanel()) {
            <aside class="w-full md:w-80 bg-white border-l border-gray-200 flex flex-col shadow-xl">
              <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <lucide-icon name="sparkles" class="h-5 w-5 text-[#155347]"></lucide-icon>
                  <h3 class="text-lg font-bold text-gray-900">AI Assistance</h3>
                </div>
                <button (click)="showAIPanel.set(false)" class="p-1 hover:bg-gray-100 rounded">
                  <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
                </button>
              </div>

            <div class="flex-1 overflow-y-auto p-6">
              <div class="mb-6">
                <h4 class="text-sm font-semibold text-gray-900 mb-3">Actions</h4>
                <div class="space-y-2">

                  <!-- Generate Summary (functional) -->
                  <button
                    (click)="generateSummary()"
                    [disabled]="summaryLoading()"
                    class="w-full p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div class="flex items-start gap-3">
                      <div class="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
                        <lucide-icon name="file-text" class="h-5 w-5 text-purple-600"></lucide-icon>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 mb-0.5">Generate Summary</p>
                        <p class="text-xs text-gray-500">Get a concise AI-generated summary of this document</p>
                      </div>
                    </div>
                  </button>

                  <!-- Generate Content (functional) -->
                  <button
                    (click)="openGeneratePanelModal()"
                    [disabled]="generateLoading()"
                    class="w-full p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div class="flex items-start gap-3">
                      <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                        <lucide-icon name="pencil-line" class="h-5 w-5 text-blue-600"></lucide-icon>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 mb-0.5">Generate Content</p>
                        <p class="text-xs text-gray-500">Generate new content from a prompt using AI</p>
                      </div>
                    </div>
                  </button>
          </div>
              </div>

              <!-- Context Section -->
              <div class="border-t border-gray-100 pt-4">
                <button
                  (click)="showContextSection.set(!showContextSection())"
                  class="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-3 hover:text-[#155347] transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <lucide-icon name="file-stack" class="h-4 w-4"></lucide-icon>
                    Context
                    @if (contextFiles().length > 0) {
                      <span class="inline-flex items-center justify-center w-4 h-4 text-xs font-medium bg-[#155347] text-white rounded-full">{{ contextFiles().length }}</span>
                    }
                  </div>
                  <lucide-icon [name]="showContextSection() ? 'chevron-up' : 'chevron-down'" class="h-4 w-4 text-gray-400"></lucide-icon>
                </button>

                @if (showContextSection()) {
                  @if (contextLoading()) {
                    <div class="flex items-center gap-2 py-2 text-gray-400">
                      <lucide-icon name="loader-circle" class="h-4 w-4 animate-spin"></lucide-icon>
                      <span class="text-xs">Loading...</span>
                    </div>
                  } @else {
                    <div class="space-y-2 mb-3">
                      @for (file of contextFiles(); track file.id) {
                        <div class="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50 group">
                          <lucide-icon name="file-text" class="h-4 w-4 text-gray-400 shrink-0"></lucide-icon>
                          <div class="flex-1 min-w-0">
                            <p class="text-xs font-medium text-gray-800 truncate" [title]="file.fileName">{{ file.fileName }}</p>
                            <p class="text-xs text-gray-400">{{ formatFileSize(file.fileSizeBytes) }}</p>
                          </div>
                          @if (file.hasExtractedText) {
                            <lucide-icon name="brain" class="h-3.5 w-3.5 text-green-500 shrink-0" title="Text extracted"></lucide-icon>
                          }
                          <button
                            (click)="removeContextFile(file.id)"
                            [disabled]="contextUploading()"
                            class="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Remove"
                          >
                            <lucide-icon name="trash-2" class="h-3.5 w-3.5"></lucide-icon>
                          </button>
                        </div>
                      }
                      @if (contextFiles().length === 0) {
                        <p class="text-xs text-gray-400 py-1">No context files yet.</p>
                      }
                    </div>

                    @if (contextError()) {
                      <p class="text-xs text-red-500 mb-2">{{ contextError() }}</p>
                    }

                    <button
                      (click)="openContextFileInput()"
                      [disabled]="contextUploading()"
                      class="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#155347] border border-dashed border-[#155347] rounded-lg hover:bg-[#155347]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      @if (contextUploading()) {
                        <lucide-icon name="loader-circle" class="h-3.5 w-3.5 animate-spin"></lucide-icon>
                        Uploading...
                      } @else {
                        <lucide-icon name="plus" class="h-3.5 w-3.5"></lucide-icon>
                        Add file (PDF, TXT)
                      }
                    </button>

                    <input
                      #contextFileInput
                      type="file"
                      accept=".pdf,.txt"
                      class="hidden"
                      (change)="onContextFileSelected($event)"
                    />
                  }
                }
              </div>

            </div>
          </aside>
        }

          <!-- Version History Sidebar -->
          @if (showVersionHistory()) {
            <aside class="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl">
              <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 class="text-lg font-bold text-gray-900">Version History</h3>
                <button
                  (click)="showVersionHistory.set(false)"
                  class="p-1 hover:bg-gray-100 rounded"
                >
                  <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
                </button>
              </div>

              <div class="flex-1 overflow-y-auto p-4">
                @if (selectedVersions().length === 2) {
                  <div class="mb-4">
                    <app-button
                      (onClick)="handleCompareVersions()"
                      customClass="w-full bg-[#155347] hover:bg-[#0d3d31]"
                    >
                      Compare Selected Versions
                    </app-button>
                  </div>
                }

                <div class="space-y-4">
                  @for (version of versions; track version.id) {
                    <div
                      [class]="
                        'p-4 border-2 rounded-lg transition-colors ' +
                        (selectedVersions().includes(version.id)
                          ? 'border-[#155347] bg-[#e8f0ee]'
                          : 'border-gray-200 hover:border-gray-300')
                      "
                    >
                      <div class="flex items-start justify-between mb-2">
                        <div>
                          <h4 class="text-sm font-bold text-gray-900">
                            Version {{ version.number }}
                          </h4>
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
                        <app-button
                          variant="outline"
                          size="sm"
                          [leftIcon]="true"
                          (onClick)="handleRestore(version.number)"
                        >
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
                  <app-button
                    size="sm"
                    customClass="bg-[#155347] hover:bg-[#0d3d31]"
                    [leftIcon]="true"
                  >
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
                        [class]="
                          'h-8 w-8 rounded-full text-white flex items-center justify-center text-xs font-medium shrink-0 ' +
                          comment.color
                        "
                      >
                        {{ comment.avatar }}
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="text-sm font-medium text-gray-900">{{
                            comment.author
                          }}</span>
                          <span class="text-xs text-gray-500">{{ comment.time }}</span>
                        </div>
                        <p class="text-sm text-gray-700">{{ comment.text }}</p>
                        <button class="text-xs text-gray-500 hover:text-[#155347] mt-2">
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </aside>
          }
        </div>

        @if (showShareModal()) {
          <app-document-share-modal
            [isOpen]="true"
            [role]="shareRole()"
            [expirationDays]="shareExpirationDays()"
            [generatedUrl]="shareGeneratedUrl()"
            [loading]="shareLoading()"
            [copied]="shareCopied()"
            [invites]="documentInvites()"
            (close)="closeShareModal()"
            (roleChange)="shareRole.set($event)"
            (expirationDaysChange)="shareExpirationDays.set($event)"
            (generateInvite)="generateInviteLink()"
            (copyInvite)="copyInviteLink()"
            (revokeInvite)="revokeInvite($event)"
            (clearInvites)="clearUsedInvites()"
            (viewInvite)="shareGeneratedUrl.set($event); shareCopied.set(false)"
          />
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
                  <lucide-icon
                    name="triangle-alert"
                    class="h-5 w-5 text-red-600 shrink-0 mt-0.5"
                  ></lucide-icon>
                  <p class="text-sm text-red-800 font-medium">
                    This action will replace the current version of the document with the selected
                    version.
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
                  <span class="text-sm text-gray-700"
                    >I understand that this action is irreversible.</span
                  >
                </label>
              </div>

              <div
                class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl"
              >
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
      }
      <!-- End of @else (loading) -->

      <!-- AI Summary Modal -->
      @if (showSummaryModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <lucide-icon name="sparkles" class="h-5 w-5 text-purple-600"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900">AI Summary</h2>
              </div>
              <button
                (click)="closeSummaryModal()"
                class="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <div class="p-6">
              @if (summaryLoading()) {
                <div class="flex flex-col items-center justify-center py-8 gap-3">
                  <lucide-icon
                    name="loader-circle"
                    class="h-8 w-8 text-purple-600 animate-spin"
                  ></lucide-icon>
                  <p class="text-gray-600 text-sm">Generating summary...</p>
                </div>
              } @else if (summaryError()) {
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div class="flex items-center gap-2 text-red-700 mb-1">
                    <lucide-icon name="circle-alert" class="h-5 w-5"></lucide-icon>
                    <span class="font-medium">Error</span>
                  </div>
                  <p class="text-sm text-red-600">{{ summaryError() }}</p>
                </div>
              } @else {
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p class="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                    {{ summaryResult() }}
                  </p>
                </div>
              }
            </div>

            <div
              class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl"
            >
              @if (!summaryLoading() && !summaryError()) {
                <app-button variant="outline" size="sm" (onClick)="copySummary()">
                  @if (summaryCopied()) {
                    <lucide-icon name="check" class="h-4 w-4 mr-1 text-green-600"></lucide-icon>
                    Copied!
                  } @else {
                    <lucide-icon name="clipboard" class="h-4 w-4 mr-1"></lucide-icon>
                    Copy
                  }
                </app-button>
              }
              <app-button variant="ghost" (onClick)="closeSummaryModal()">Close</app-button>
            </div>
          </div>
        </div>
      }

      <!-- AI Generate Content Panel Modal -->
      @if (showGeneratePanelModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <lucide-icon name="sparkles" class="h-5 w-5 text-blue-600"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900">Generate Content</h2>
              </div>
              <button
                (click)="closeGeneratePanelModal()"
                class="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <div class="p-6">
              <!-- Prompt input (shown before generation) -->
              @if (!generateLoading() && !generateResult() && !generateError()) {
                <textarea
                  [(ngModel)]="generatePrompt"
                  placeholder="Describe the content you want to generate..."
                  rows="4"
                  class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none placeholder:text-gray-400"
                ></textarea>
                @if (contextFiles().length > 0) {
                  <p class="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <lucide-icon name="file-stack" class="h-3.5 w-3.5"></lucide-icon>
                    {{ contextFiles().length }} context file{{ contextFiles().length > 1 ? 's' : '' }} will be included
                  </p>
                }
              }

              <!-- Loading -->
              @if (generateLoading()) {
                <div class="flex flex-col items-center justify-center py-8 gap-3">
                  <lucide-icon name="loader-circle" class="h-8 w-8 text-blue-600 animate-spin"></lucide-icon>
                  <p class="text-gray-600 text-sm">Generating content...</p>
                </div>
              }

              <!-- Error -->
              @if (generateError()) {
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div class="flex items-center gap-2 text-red-700 mb-1">
                    <lucide-icon name="circle-alert" class="h-5 w-5"></lucide-icon>
                    <span class="font-medium">Error</span>
                  </div>
                  <p class="text-sm text-red-600">{{ generateError() }}</p>
                </div>
              }

              <!-- Result -->
              @if (!generateLoading() && !generateError() && generateResult()) {
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p class="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{{ generateResult() }}</p>
                </div>
              }
            </div>

            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
              @if (!generateLoading() && !generateResult() && !generateError()) {
                <app-button
                  variant="primary"
                  size="sm"
                  (onClick)="submitGeneratePrompt()"
                  [disabled]="!generatePrompt.trim()"
                >
                  <lucide-icon name="sparkles" class="h-4 w-4 mr-1"></lucide-icon>
                  Generate
                </app-button>
              }
              @if (generateError()) {
                <app-button variant="outline" size="sm" (onClick)="resetGeneratePanelModal()">
                  Try again
                </app-button>
              }
              @if (!generateLoading() && !generateError() && generateResult()) {
                <app-button variant="outline" size="sm" (onClick)="copyGeneratedContent()">
                  @if (generateCopied()) {
                    <lucide-icon name="check" class="h-4 w-4 mr-1 text-green-600"></lucide-icon>
                    Copied!
                  } @else {
                    <lucide-icon name="clipboard" class="h-4 w-4 mr-1"></lucide-icon>
                    Copy
                  }
                </app-button>
              }
              <app-button variant="ghost" (onClick)="closeGeneratePanelModal()">Close</app-button>
            </div>
          </div>
        </div>
      }

      <!-- Work in Progress Modal -->
      <app-work-in-progress [show]="showWipModal()" (close)="showWipModal.set(false)" />

      <!-- AI Improve Inline Card (aparece junto ao texto selecionado) -->
      @if (showImproveModal()) {
        <div
          class="fixed z-50 bg-white rounded-xl shadow-2xl border border-purple-100 w-[400px] flex flex-col animate-in fade-in slide-in-from-top-2"
          [style.top.px]="improveCardPosition().top"
          [style.left.px]="improveCardPosition().left"
          style="max-height: 360px;"
        >
          <!-- Card Header -->
          <div class="px-4 py-3 flex items-center justify-between shrink-0 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
                <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-purple-600"></lucide-icon>
              </div>
              <span class="text-sm font-semibold text-gray-900">Improve with AI</span>
            </div>
            <button
              (click)="closeImproveModal()"
              class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
            </button>
          </div>

          <!-- Card Body -->
          <div class="flex-1 overflow-y-auto">
            @if (improveLoading()) {
              <div class="flex flex-col items-center justify-center py-10 gap-3">
                <lucide-icon name="loader-circle" class="h-6 w-6 text-purple-600 animate-spin"></lucide-icon>
                <p class="text-xs text-gray-500">Analyzing and improving your text...</p>
              </div>
            } @else if (improveError()) {
              <div class="m-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <lucide-icon name="circle-alert" class="h-4 w-4 text-red-500 shrink-0 mt-0.5"></lucide-icon>
                <p class="text-xs text-red-600">{{ improveError() }}</p>
              </div>
            } @else {
              <!-- Split diff view -->
              <div class="divide-y divide-gray-100">
                <!-- Original -->
                <div class="px-4 py-3">
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Original</p>
                  <p class="text-xs text-gray-400 leading-relaxed line-clamp-3 line-through">{{ improveOriginalText() }}</p>
                </div>
                <!-- Sugestão -->
                <div class="px-4 py-3 bg-purple-50/60">
                  <p class="text-[10px] font-semibold text-purple-500 uppercase tracking-widest mb-1.5">Suggestion</p>
                  <p class="text-sm text-gray-800 leading-relaxed">{{ improveResult() }}</p>
                </div>
              </div>
            }
          </div>

          <!-- Card Footer -->
          @if (!improveLoading() && !improveError() && improveResult()) {
            <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
              <button
                (click)="closeImproveModal()"
                class="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Discard
              </button>
              <button
                (click)="copyImprovedText()"
                class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                @if (improveCopied()) {
                  <lucide-icon name="check" class="h-3.5 w-3.5 text-green-600"></lucide-icon>
                  <span>Copied!</span>
                } @else {
                  <lucide-icon name="clipboard" class="h-3.5 w-3.5"></lucide-icon>
                  <span>Copy</span>
                }
              </button>
              <button
                (click)="applyImprovedText()"
                class="px-3 py-1.5 text-xs bg-[#155347] text-white rounded-lg hover:bg-[#0d3d31] transition-colors flex items-center gap-1.5"
              >
                <lucide-icon name="check" class="h-3.5 w-3.5"></lucide-icon>
                <span>Apply</span>
              </button>
            </div>
          }
        </div>
      }

      <!-- AI Generate Content Inline Card -->
      @if (showGenerateCard()) {
        <div
          class="fixed z-50 bg-white rounded-xl shadow-2xl border border-blue-100 w-[440px] flex flex-col animate-in fade-in slide-in-from-top-2"
          [style.top.px]="generateCardPosition().top"
          [style.left.px]="generateCardPosition().left"
          style="max-height: 420px;"
        >
          <!-- Card Header -->
          <div class="px-4 py-3 flex items-center justify-between shrink-0 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-blue-600"></lucide-icon>
              </div>
              <span class="text-sm font-semibold text-gray-900">Generate with AI</span>
            </div>
            <button
              (click)="closeGenerateCard()"
              class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
            </button>
          </div>

          <!-- Prompt Input -->
          @if (!generateLoading() && !generateResult() && !generateError()) {
            <div class="p-4">
              <textarea
                #generatePromptInput
                [(ngModel)]="generatePrompt"
                placeholder="Describe the content you want to generate..."
                rows="3"
                class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none placeholder:text-gray-400"
                (keydown.enter)="onGenerateKeydown($event)"
              ></textarea>
              <div class="flex items-center justify-between mt-3">
                <p class="text-[10px] text-gray-400">
                  @if (contextFiles().length > 0) {
                    <lucide-icon name="file-stack" class="h-3 w-3 inline-block mr-0.5 -mt-0.5"></lucide-icon>
                    {{ contextFiles().length }} context file{{ contextFiles().length > 1 ? 's' : '' }} included
                  }
                </p>
                <button
                  (click)="submitGeneratePrompt()"
                  [disabled]="!generatePrompt.trim()"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#155347] text-white rounded-lg hover:bg-[#0d3d31] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <lucide-icon name="sparkles" class="h-3.5 w-3.5"></lucide-icon>
                  Generate
                </button>
              </div>
            </div>
          }

          <!-- Loading State -->
          @if (generateLoading()) {
            <div class="flex flex-col items-center justify-center py-10 gap-3">
              <lucide-icon name="loader-circle" class="h-6 w-6 text-blue-600 animate-spin"></lucide-icon>
              <p class="text-xs text-gray-500">Generating content...</p>
            </div>
          }

          <!-- Error State -->
          @if (generateError()) {
            <div class="m-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <lucide-icon name="circle-alert" class="h-4 w-4 text-red-500 shrink-0 mt-0.5"></lucide-icon>
              <p class="text-xs text-red-600">{{ generateError() }}</p>
            </div>
            <div class="px-4 pb-4 flex justify-end">
              <button
                (click)="resetGenerateCard()"
                class="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Try again
              </button>
            </div>
          }

          <!-- Result State -->
          @if (!generateLoading() && !generateError() && generateResult()) {
            <div class="flex-1 overflow-y-auto">
              <div class="px-4 py-3 bg-blue-50/60">
                <p class="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-1.5">Generated Content</p>
                <p class="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{{ generateResult() }}</p>
              </div>
            </div>
            <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
              <button
                (click)="closeGenerateCard()"
                class="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Discard
              </button>
              <button
                (click)="copyGeneratedContent()"
                class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                @if (generateCopied()) {
                  <lucide-icon name="check" class="h-3.5 w-3.5 text-green-600"></lucide-icon>
                  <span>Copied!</span>
                } @else {
                  <lucide-icon name="clipboard" class="h-3.5 w-3.5"></lucide-icon>
                  <span>Copy</span>
                }
              </button>
              <button
                (click)="insertGeneratedContent()"
                class="px-3 py-1.5 text-xs bg-[#155347] text-white rounded-lg hover:bg-[#0d3d31] transition-colors flex items-center gap-1.5"
              >
                <lucide-icon name="check" class="h-3.5 w-3.5"></lucide-icon>
                <span>Insert</span>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DocumentEditorComponent implements OnInit {
  @ViewChild('editor') editor!: TextEditorComponent;
  @ViewChild('contextFileInput') contextFileInput!: ElementRef<HTMLInputElement>;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private documentService = inject(DocumentService);
  private inviteService = inject(DocumentInviteService);
  private collaborationService = inject(CollaborationService);
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
  showMobileMenu = signal(false);
  isRestoreModalOpen = signal(false);
  versionToRestore = signal<number | null>(null);
  newComment = '';
  selectedVersions = signal<number[]>([]);
  aiGenerating = signal(false);
  restoreConfirmed = false;

  // AI Summary
  showSummaryModal = signal(false);
  summaryResult = signal('');
  summaryLoading = signal(false);
  summaryError = signal<string | null>(null);
  summaryCopied = signal(false);

  // AI Improve Text
  showImproveTooltip = signal(false);
  improveTooltipPosition = signal({ top: 0, left: 0 });
  showImproveModal = signal(false);
  improveCardPosition = signal({ top: 0, left: 0 });
  improveOriginalText = signal('');
  improveResult = signal('');
  improveLoading = signal(false);
  improveError = signal<string | null>(null);
  improveCopied = signal(false);
  private selectedTextForImprove = '';
  private selectionBounds = { top: 0, left: 0, width: 0, height: 0 };

  // AI Generate Content
  showGeneratePanelModal = signal(false);
  showGenerateCard = signal(false);
  generateCardPosition = signal({ top: 0, left: 0 });
  generatePrompt = '';
  generateResult = signal('');
  generateLoading = signal(false);
  generateError = signal<string | null>(null);
  generateCopied = signal(false);

  // AI Context
  contextFiles = signal<DocumentContextDto[]>([]);
  contextLoading = signal(false);
  contextUploading = signal(false);
  contextError = signal<string | null>(null);
  showContextSection = signal(true);

  // Document state
  documentTitle = '';
  originalTitle = '';
  isEditingTitle = signal(false);
  lastEdited = signal(new Date());

  // Conteúdo inicial do editor (carregado do backend)
  initialContent = '';

  // Role efetiva do utilizador neste documento ("Editor" ou "Viewer")
  // Team Owners/Admins recebem "Editor" via bypass no backend
  documentRole = signal<string>('Viewer');
  canEdit = computed(() => this.documentRole() === 'Editor');

  // TODO: Implementar colaboração em tempo real
  collaborators: Collaborator[] = [];

  shareRole = signal<number>(0); // 0=Viewer, 1=Editor
  shareExpirationDays = signal<number>(7);
  shareGeneratedUrl = signal<string | null>(null);
  shareLoading = signal(false);
  shareCopied = signal(false);
  documentInvites = signal<DocumentInviteDto[]>([]);
  showInvitesPanel = signal(false);
  lastCopiedInviteId = signal<number | null>(null);

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
        this.documentRole.set(doc.role || 'Viewer');
        this.isLoading.set(false);
        this.loadDocumentInvites(doc.id);
        if (doc.role === 'Editor') {
          this.loadContextFiles();
        }
      },
      error: (err) => {
        console.error('Error loading document:', err);
        this.loadError.set(err.error?.message || 'Error loading document');
        this.isLoading.set(false);
        // Redirecionar para dashboard após delay
        setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      },
    });
  }


  
  loadContextFiles(): void {
    if (!this.documentId) return;
    this.contextLoading.set(true);
    this.contextError.set(null);
    this.documentService.getContextFiles(this.documentId).subscribe({
      next: (files) => {
        this.contextFiles.set(files);
        this.contextLoading.set(false);
      },
      error: (err) => {
        this.contextError.set(err.error?.message || 'Error loading context files.');
        this.contextLoading.set(false);
      }
    });
  }

  openContextFileInput(): void {
    this.contextFileInput.nativeElement.click();
  }

  onContextFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.documentId) return;

    input.value = '';
    this.contextUploading.set(true);
    this.contextError.set(null);

    this.documentService.uploadContextFile(this.documentId, file).subscribe({
      next: (dto) => {
        this.contextFiles.update(files => [dto, ...files]);
        this.contextUploading.set(false);
      },
      error: (err) => {
        this.contextError.set(err.error?.message || 'Error uploading file.');
        this.contextUploading.set(false);
      }
    });
  }

  removeContextFile(contextId: number): void {
    if (!this.documentId) return;
    this.documentService.deleteContextFile(this.documentId, contextId).subscribe({
      next: () => {
        this.contextFiles.update(files => files.filter(f => f.id !== contextId));
      },
      error: (err) => {
        this.contextError.set(err.error?.message || 'Error removing context file.');
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  pendingInvites(): DocumentInviteDto[] {
    return this.documentInvites().filter((inv) => !inv.isUsed);
  }

  openShareModal(): void {
    if (!this.documentId) return;
    this.shareRole.set(0);
    this.shareExpirationDays.set(7);
    this.shareGeneratedUrl.set(null);
    this.shareCopied.set(false);
    this.showShareModal.set(true);
    this.loadDocumentInvites(this.documentId);
  }

  closeShareModal(): void {
    this.showShareModal.set(false);
    this.shareGeneratedUrl.set(null);
  }

  generateInviteLink(): void {
    if (!this.documentId) return;

    this.shareLoading.set(true);
    this.inviteService
      .createInvite({
        documentId: this.documentId,
        role: this.shareRole(),
        expirationDays: this.shareExpirationDays(),
      })
      .subscribe({
        next: (invite) => {
          this.shareGeneratedUrl.set(invite.inviteUrl);
          this.shareLoading.set(false);
          this.shareCopied.set(false);
          this.loadDocumentInvites(this.documentId!);
        },
        error: (err) => {
          console.error('Error creating invite:', err);
          this.shareLoading.set(false);
        },
      });
  }

  copyInviteLink(): void {
    const url = this.shareGeneratedUrl();
    if (!url) return;

    navigator.clipboard.writeText(url).then(() => {
      this.shareCopied.set(true);
      setTimeout(() => this.shareCopied.set(false), 3000);
    });
  }

  revokeInvite(inviteId: number): void {
    this.inviteService.revokeInvite(inviteId).subscribe({
      next: () => {
        if (this.documentId) this.loadDocumentInvites(this.documentId);
      },
      error: (err) => {
        console.error('Error revoking invite:', err);
      },
    });
  }

  clearUsedInvites(): void {
    const usedInvites = this.documentInvites().filter((inv) => inv.isUsed);
    if (usedInvites.length === 0) return;

    let completed = 0;
    usedInvites.forEach((inv) => {
      this.inviteService.revokeInvite(inv.id).subscribe({
        next: () => {
          completed += 1;
          if (completed === usedInvites.length && this.documentId) {
            this.loadDocumentInvites(this.documentId);
          }
        },
        error: () => {
          completed += 1;
          if (completed === usedInvites.length && this.documentId) {
            this.loadDocumentInvites(this.documentId);
          }
        },
      });
    });
  }

  copyInviteUrl(inviteId: number, url: string): void {
    if (!url) return;
    window.navigator.clipboard.writeText(url).catch(() => {
      console.error('Failed to copy invite link.');
    });
    this.lastCopiedInviteId.set(inviteId);
    setTimeout(() => {
      if (this.lastCopiedInviteId() === inviteId) {
        this.lastCopiedInviteId.set(null);
      }
    }, 1000);
  }

  toggleInvitesPanel(): void {
    this.showInvitesPanel.set(!this.showInvitesPanel());
  }

  private loadDocumentInvites(docId: number): void {
    this.inviteService.getInvitesByDocument(docId).subscribe({
      next: (invites) => {
        this.documentInvites.set(invites);
      },
      error: () => {
        // Hide panel for non-owners/admins or in case of errors
        this.documentInvites.set([]);
        this.showInvitesPanel.set(false);
      },
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
    if (!this.canEdit()) return;
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
      this.documentService
        .updateDocument(this.documentId, {
          title: this.documentTitle,
        })
        .subscribe({
          next: () => {
            this.originalTitle = this.documentTitle;
            this.updateLastEdited();
          },
          error: (err) => {
            console.error('Error saving title:', err);
            // Reverter título em caso de erro
            this.documentTitle = this.originalTitle;
          },
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
    if (!this.canEdit()) return;
    if (!this.documentId) {
      console.warn('Cannot save: Document ID is missing');
      this.editor.setSaveStatus('error');
      return;
    }

    // Incluir snapshot Y.Doc no mesmo pedido HTTP para garantir que
    // HTML e snapshot ficam sincronizados.
    const snapshot = this.collaborationService.getSnapshotBase64() ?? undefined;

    this.documentService.updateDocument(this.documentId, { content, yDocSnapshot: snapshot }).subscribe({
      next: () => {
        this.editor.setSaveStatus('saved');
        this.updateLastEdited();
        // Voltar a idle após 2 segundos
        setTimeout(() => {
          if (this.editor.saveStatus() === 'saved') this.editor.setSaveStatus('idle');
        }, 2000);
      },
      error: (err) => {
        console.error('Error saving document:', err);
        this.editor.setSaveStatus('error');
      },
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

  generateSummary(): void {
    if (!this.documentId) return;

    this.showAIPanel.set(false);
    this.summaryResult.set('');
    this.summaryError.set(null);
    this.summaryLoading.set(true);
    this.summaryCopied.set(false);
    this.showSummaryModal.set(true);

    this.documentService.generateSummary(this.documentId).subscribe({
      next: (res) => {
        this.summaryResult.set(res.summary);
        this.summaryLoading.set(false);
      },
      error: (err) => {
        console.error('Error generating summary:', err);
        this.summaryError.set(
          err.error?.message || 'Failed to generate summary. Please try again.',
        );
        this.summaryLoading.set(false);
      },
    });
  }

  closeSummaryModal(): void {
    this.showSummaryModal.set(false);
  }

  copySummary(): void {
    const text = this.summaryResult();
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      this.summaryCopied.set(true);
      setTimeout(() => this.summaryCopied.set(false), 3000);
    });
  }

  handleAIAction(actionId: number): void {
    this.aiGenerating.set(true);
    setTimeout(() => this.aiGenerating.set(false), 2000);
  }

  // AI Improve Text
  onSelectionChange(event: { text: string; bounds: { top: number; left: number; width: number; height: number } | null }): void {
    if (event.text && event.text.trim().length > 0 && event.bounds) {
      this.selectedTextForImprove = event.text;
      this.selectionBounds = event.bounds;
      // Posicionar o tooltip acima da seleção, com clamp para não sair da viewport
      const tooltipWidth = 140;
      const rawLeft = event.bounds.left + (event.bounds.width / 2) - (tooltipWidth / 2);
      this.improveTooltipPosition.set({
        top: Math.max(8, event.bounds.top - 40),
        left: Math.max(8, Math.min(rawLeft, window.innerWidth - tooltipWidth - 8)),
      });
      this.showImproveTooltip.set(true);
    } else {
      this.showImproveTooltip.set(false);
    }
  }

  requestImproveText(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.documentId || !this.selectedTextForImprove.trim()) return;

    this.showImproveTooltip.set(false);
    this.triggerImproveRequest();
  }

  private triggerImproveRequest(): void {
    if (!this.documentId || !this.selectedTextForImprove.trim()) return;

    // Posicionar o card inline abaixo da seleção
    const cardWidth = 400;
    const cardHeight = 360;
    const cardMargin = 8;
    const rawLeft = this.selectionBounds.left + (this.selectionBounds.width / 2) - (cardWidth / 2);
    const clampedLeft = Math.max(cardMargin, Math.min(rawLeft, window.innerWidth - cardWidth - cardMargin));

    // Preferir abaixo da seleção; se não couber, clamp para que o card não saia do ecrã
    const belowTop = this.selectionBounds.top + this.selectionBounds.height + cardMargin;
    const clampedTop = Math.min(belowTop, window.innerHeight - cardHeight - cardMargin);

    this.improveCardPosition.set({
      top: Math.max(cardMargin, clampedTop),
      left: clampedLeft,
    });

    this.improveOriginalText.set(this.selectedTextForImprove);
    this.improveResult.set('');
    this.improveError.set(null);
    this.improveLoading.set(true);
    this.improveCopied.set(false);
    this.showImproveModal.set(true);

    this.documentService.improveText(this.documentId, this.selectedTextForImprove).subscribe({
      next: (res) => {
        this.improveResult.set(res.improvedText);
        this.improveLoading.set(false);
      },
      error: (err) => {
        console.error('Error improving text:', err);
        this.improveError.set(
          err.error?.message || 'Failed to improve text. Please try again.',
        );
        this.improveLoading.set(false);
      },
    });
  }

  applyImprovedText(): void {
    const improvedText = this.improveResult();
    if (!improvedText || !this.editor) return;

    this.editor.replaceSelectedText(improvedText);
    this.closeImproveModal();
  }

  copyImprovedText(): void {
    const text = this.improveResult();
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      this.improveCopied.set(true);
      setTimeout(() => this.improveCopied.set(false), 3000);
    });
  }

  closeImproveModal(): void {
    this.showImproveModal.set(false);
  }

  // AI Generate Content
  openGeneratePanelModal(): void {
    this.showAIPanel.set(false);
    this.generatePrompt = '';
    this.generateResult.set('');
    this.generateError.set(null);
    this.generateLoading.set(false);
    this.generateCopied.set(false);
    this.showGeneratePanelModal.set(true);
  }

  closeGeneratePanelModal(): void {
    this.showGeneratePanelModal.set(false);
    this.generatePrompt = '';
    this.generateResult.set('');
    this.generateError.set(null);
    this.generateLoading.set(false);
    this.generateCopied.set(false);
  }

  resetGeneratePanelModal(): void {
    this.generateError.set(null);
    this.generateResult.set('');
    this.generatePrompt = '';
    this.generateLoading.set(false);
  }

  onGenerateButtonClick(event: { viewportTop: number; viewportLeft: number; viewportHeight: number }): void {
    // Posicionar o card abaixo do cursor usando coords viewport frescas do clique
    const cardWidth = 440;
    const cardHeight = 420;
    const cardMargin = 8;
    const rawLeft = event.viewportLeft - 20;
    const clampedLeft = Math.max(cardMargin, Math.min(rawLeft, window.innerWidth - cardWidth - cardMargin));

    // Preferir abaixo do botão; se não couber, clamp para que o card não saia do ecrã
    const belowTop = event.viewportTop + event.viewportHeight + cardMargin;
    const clampedTop = Math.min(belowTop, window.innerHeight - cardHeight - cardMargin);

    this.generateCardPosition.set({
      top: Math.max(cardMargin, clampedTop),
      left: clampedLeft,
    });

    this.generatePrompt = '';
    this.generateResult.set('');
    this.generateError.set(null);
    this.generateLoading.set(false);
    this.generateCopied.set(false);
    this.showGenerateCard.set(true);
  }

  onGenerateKeydown(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    if (!kbEvent.shiftKey) {
      kbEvent.preventDefault();
      this.submitGeneratePrompt();
    }
  }

  submitGeneratePrompt(): void {
    if (!this.documentId || !this.generatePrompt.trim()) return;

    this.generateResult.set('');
    this.generateError.set(null);
    this.generateLoading.set(true);

    this.documentService.generateContent(this.documentId, this.generatePrompt.trim()).subscribe({
      next: (res) => {
        this.generateResult.set(res.generatedContent);
        this.generateLoading.set(false);
      },
      error: (err) => {
        console.error('Error generating content:', err);
        this.generateError.set(
          err.error?.message || 'Failed to generate content. Please try again.',
        );
        this.generateLoading.set(false);
      },
    });
  }

  insertGeneratedContent(): void {
    const content = this.generateResult();
    if (!content || !this.editor) return;

    this.editor.insertTextAtCursor(content);
    this.closeGenerateCard();
  }

  copyGeneratedContent(): void {
    const text = this.generateResult();
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      this.generateCopied.set(true);
      setTimeout(() => this.generateCopied.set(false), 3000);
    });
  }

  resetGenerateCard(): void {
    this.generateError.set(null);
    this.generateResult.set('');
    this.generateLoading.set(false);
  }

  closeGenerateCard(): void {
    this.showGenerateCard.set(false);
    this.generatePrompt = '';
    this.generateResult.set('');
    this.generateError.set(null);
    this.generateLoading.set(false);
    this.generateCopied.set(false);
  }
}
