import { Component, inject, signal, ViewChild, ElementRef, OnInit, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule, ThumbsDown } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ButtonComponent,
  BadgeComponent,
  WorkInProgressComponent,
} from '../../shared/components/ui';
import { DocumentShareModalComponent } from '../../shared/components/document-share-modal/document-share-modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { DocumentService, DocumentInviteService, CollaborationService, DocumentPermissionService, TeamService } from '../../core/services';
import { Collaborator, Version, CommentDto, CreateCommentDto, AISuggestion, DocumentInviteDto, DocumentContextDto, DocumentVersionDto, DocumentVersionDetailDto, User } from '../../core/models';
import { TextEditorComponent } from './components/text-editor.component';
import { AuthService } from '../../core/services';
import Quill from 'quill/core/quill';
import { forkJoin, switchMap } from 'rxjs';
import { diffWords } from 'diff';
// import { HttpClient } from '@angular/common/http';
// import { Observable, catchError, of } from 'rxjs';

@Component({
  selector: 'app-document-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslateModule,
    ButtonComponent,
    BadgeComponent,
    TextEditorComponent,
    WorkInProgressComponent,
    DocumentShareModalComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col relative">
      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center h-screen gap-4">
          <lucide-icon
            name="loader-circle"
            class="h-10 w-10 text-[#155347] dark:text-emerald-400 animate-spin"
          ></lucide-icon>
          <div class="text-gray-500 dark:text-gray-400 text-sm">{{ 'DOCUMENT_EDITOR.LOADING' | translate }}</div>
        </div>
      } @else if (loadError()) {
        <div class="flex flex-col items-center justify-center h-screen gap-4">
          <lucide-icon name="circle-alert" class="h-10 w-10 text-red-500"></lucide-icon>
          <div class="text-red-600 text-sm">{{ loadError() }}</div>
          <div class="text-gray-500 text-xs">{{ 'DOCUMENT_EDITOR.REDIRECTING' | translate }}</div>
        </div>
      } @else {
        <!-- Header -->
        <header
          class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 md:px-6 py-2 md:py-4 flex items-center justify-between gap-2 shrink-0"
        >
          <div class="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <button
              (click)="navigateBack()"
              class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            >
                <lucide-icon name="arrow-left" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
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
                      class="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-[#155347] focus:outline-none w-full max-w-md"
                    />
                  } @else {
                    <h1
                      (click)="startEditingTitle()"
                      class="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-[#155347] dark:hover:text-emerald-400 transition-colors truncate"
                      [title]="'DOCUMENT_EDITOR.CLICK_TO_EDIT' | translate"
                    >
                      {{ documentTitle }}
                    </h1>
                  }
                } @else {
                  <h1 class="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
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
                      <span class="hidden sm:inline">{{ 'DOCUMENT_EDITOR.VIEW_ONLY' | translate }}</span>
                    </span>
                  }
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 md:gap-2 flex-shrink-0">
            @if (canEdit()) {
              <app-button variant="outline" size="sm" [leftIcon]="true" (onClick)="toggleAIPanel()" customClass="hidden md:inline-flex">
                <lucide-icon leftIcon name="sparkles" class="h-4 w-4"></lucide-icon>
                {{ 'DOCUMENT_EDITOR.AI_ASSISTANCE' | translate }}
              </app-button>
              <app-button
                variant="outline"
                size="sm"
                [leftIcon]="true"
                (onClick)="toggleVersionHistory()" customClass="hidden md:inline-flex"
              >
                <lucide-icon leftIcon name="clock" class="h-4 w-4"></lucide-icon>
                {{ 'DOCUMENT_EDITOR.HISTORY' | translate }}
              </app-button>
              <app-button
                variant="outline"
                size="sm"
                [leftIcon]="true"
                (onClick)="toggleComments()" customClass="hidden md:inline-flex"
              >
                <lucide-icon leftIcon name="message-square" class="h-4 w-4"></lucide-icon>
                {{ 'DOCUMENT_EDITOR.COMMENTS' | translate }}
              </app-button>
            }
            @if (pendingInvites().length > 0) {
              <div class="relative">
                <button
                  (click)="toggleInvitesPanel()"
                  class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                  [title]="'DOCUMENT_EDITOR.INVITES' | translate"
                >
                  <lucide-icon name="user-plus" class="h-3.5 w-3.5 text-gray-600 dark:text-gray-400"></lucide-icon>
                  {{ 'DOCUMENT_EDITOR.INVITES' | translate }}
                  <span
                    class="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[#155347] text-white text-[10px]"
                  >
                    {{ pendingInvites().length }}
                  </span>
                </button>
                @if (showInvitesPanel()) {
                  <div
                    class="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-10"
                  >
                    <div class="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                      {{ 'DOCUMENT_EDITOR.PENDING_INVITES' | translate }}
                    </div>
                    <div class="divide-y divide-gray-100 dark:divide-gray-700">
                      @for (inv of pendingInvites(); track inv.id) {
                        <div class="px-3 py-2 text-sm flex items-center justify-between">
                          <div>
                            <div class="font-medium text-gray-900 dark:text-gray-100">
                              {{ inv.role === 1 ? ('DOCUMENT_EDITOR.EDITOR_INVITE' | translate) : ('DOCUMENT_EDITOR.VIEWER_INVITE' | translate) }}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                              {{ 'DOCUMENT_EDITOR.EXPIRES' | translate }} {{ inv.expiresAt | date: 'dd/MM/yyyy' }}
                            </div>
                          </div>
                          <button
                            (click)="copyInviteUrl(inv.id, inv.inviteUrl)"
                            class="text-xs font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                          >
                            {{ lastCopiedInviteId() === inv.id ? ('DOCUMENT_EDITOR.COPIED' | translate) : ('DOCUMENT_EDITOR.COPY_LINK' | translate) }}
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
                {{ 'DOCUMENT_EDITOR.SHARE' | translate }}
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
                  <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-20">
                    <button
                      (click)="toggleAIPanel(); showMobileMenu.set(false)"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <lucide-icon name="sparkles" class="h-4 w-4 shrink-0"></lucide-icon>
                      {{ 'DOCUMENT_EDITOR.AI_ASSISTANCE' | translate }}
                    </button>
                    <button
                      (click)="toggleVersionHistory(); showMobileMenu.set(false)"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <lucide-icon name="clock" class="h-4 w-4 shrink-0"></lucide-icon>
                      {{ 'DOCUMENT_EDITOR.HISTORY' | translate }}
                    </button>
                    <button
                      (click)="showWipModal.set(true); showMobileMenu.set(false)"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <lucide-icon name="message-square" class="h-4 w-4 shrink-0"></lucide-icon>
                      {{ 'DOCUMENT_EDITOR.COMMENTS' | translate }}
                    </button>
                    <div class="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                    <button
                      (click)="openShareModal(); showMobileMenu.set(false)"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <lucide-icon name="share-2" class="h-4 w-4 shrink-0"></lucide-icon>
                      {{ 'DOCUMENT_EDITOR.SHARE' | translate }}
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
              [placeholder]="'DOCUMENT_EDITOR.PLACEHOLDER' | translate"
              [autoSaveDelay]="2000"
              [editable]="canEdit()"
              (contentChange)="onContentChange($event)"
              (save)="onSave($event)"
              (selectionChange)="onSelectionChange($event)"
              (generateButtonClick)="onGenerateButtonClick($event)"
              (collaborationReady)="onCollaborationReady()"
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
                  {{ 'DOCUMENT_EDITOR.IMPROVE_WITH_AI' | translate }}
                </button>
                <button
                  (mousedown)="addCommentSelection($event)"
                  class="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/20 transition-colors text-xs font-medium"
                >
                  <lucide-icon name="message-square" class="h-3.5 w-3.5 text-blue-300"></lucide-icon>
                  {{ 'DOCUMENT_EDITOR.ADD_COMMENT_BTN' | translate }}
                </button>
              </div>
            }


          </main>

          <!-- AI Assistant Panel -->
          @if (showAIPanel()) {
            <aside class="w-full md:w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-xl">
              <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <lucide-icon name="sparkles" class="h-5 w-5 text-[#155347] dark:text-emerald-400"></lucide-icon>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'DOCUMENT_EDITOR.AI_ASSISTANCE' | translate }}</h3>
                </div>
                <button (click)="showAIPanel.set(false)" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
                </button>
              </div>

            <div class="flex-1 overflow-y-auto p-6">
              <div class="mb-6">
                <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ 'DOCUMENT_EDITOR.ACTIONS' | translate }}</h4>
                <div class="space-y-2">

                  <!-- Generate Summary (functional) -->
                  <button
                    (click)="generateSummary()"
                    [disabled]="summaryLoading()"
                    class="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div class="flex items-start gap-3">
                      <div class="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                        <lucide-icon name="file-text" class="h-5 w-5 text-purple-600 dark:text-purple-400"></lucide-icon>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-0.5">{{ 'DOCUMENT_EDITOR.GENERATE_SUMMARY' | translate }}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ 'DOCUMENT_EDITOR.GENERATE_SUMMARY_DESC' | translate }}</p>
                      </div>
                    </div>
                  </button>

                  <!-- Generate Content (functional) -->
                  <button
                    (click)="openGeneratePanelModal()"
                    [disabled]="generateLoading()"
                    class="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div class="flex items-start gap-3">
                      <div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                        <lucide-icon name="pencil-line" class="h-5 w-5 text-blue-600 dark:text-blue-400"></lucide-icon>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-0.5">{{ 'DOCUMENT_EDITOR.GENERATE_CONTENT' | translate }}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ 'DOCUMENT_EDITOR.GENERATE_CONTENT_DESC' | translate }}</p>
                      </div>
                    </div>
                  </button>
          </div>
              </div>

              <!-- Context Section -->
              <div class="border-t border-gray-100 dark:border-gray-700 pt-4">
                <button
                  (click)="showContextSection.set(!showContextSection())"
                  class="w-full flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 hover:text-[#155347] dark:hover:text-emerald-400 transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <lucide-icon name="file-stack" class="h-4 w-4"></lucide-icon>
                    {{ 'DOCUMENT_EDITOR.CONTEXT' | translate }}
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
                      <span class="text-xs">{{ 'DOCUMENT_EDITOR.CONTEXT_LOADING' | translate }}</span>
                    </div>
                  } @else {
                    <div class="space-y-2 mb-3">
                      @for (file of contextFiles(); track file.id) {
                        <div class="flex items-center gap-2 p-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 group">
                          <lucide-icon name="file-text" class="h-4 w-4 text-gray-400 shrink-0"></lucide-icon>
                          <div class="flex-1 min-w-0">
                            <p class="text-xs font-medium text-gray-800 dark:text-gray-200 truncate" [title]="file.fileName">{{ file.fileName }}</p>
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
                        <p class="text-xs text-gray-400 py-1">{{ 'DOCUMENT_EDITOR.NO_CONTEXT_FILES' | translate }}</p>
                      }
                    </div>

                    @if (contextError()) {
                      <p class="text-xs text-red-500 mb-2">{{ contextError() }}</p>
                    }

                    <button
                      (click)="openContextFileInput()"
                      [disabled]="contextUploading()"
                      class="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#155347] dark:text-emerald-400 border border-dashed border-[#155347] rounded-lg hover:bg-[#155347]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      @if (contextUploading()) {
                        <lucide-icon name="loader-circle" class="h-3.5 w-3.5 animate-spin"></lucide-icon>
                        {{ 'DOCUMENT_EDITOR.UPLOADING' | translate }}
                      } @else {
                        <lucide-icon name="plus" class="h-3.5 w-3.5"></lucide-icon>
                        {{ 'DOCUMENT_EDITOR.ADD_FILE' | translate }}
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
            <aside class="w-full md:w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-xl">
              <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <lucide-icon name="clock" class="h-5 w-5 text-[#155347] dark:text-emerald-400"></lucide-icon>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'DOCUMENT_EDITOR.VERSION_HISTORY' | translate }}</h3>
                </div>
                <button
                  (click)="showVersionHistory.set(false); selectedVersions.set([])"
                  class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <lucide-icon name="x" class="h-5 w-5 text-gray-500 dark:text-gray-400"></lucide-icon>
                </button>
              </div>

              <div class="flex-1 overflow-y-auto p-4">
                @if (selectedVersions().length === 2) {
                  <div class="mb-4">
                    <app-button
                      (onClick)="handleCompareVersions()"
                      customClass="w-full bg-[#155347] hover:bg-[#0d3d31]"
                    >
                      {{ 'DOCUMENT_EDITOR.COMPARE_VERSIONS' | translate }}
                    </app-button>
                  </div>
                }

                @if (versionsLoading()) {
                  <div class="flex flex-col items-center justify-center py-12 gap-3">
                    <lucide-icon name="loader-circle" class="h-6 w-6 text-[#155347] dark:text-emerald-400 animate-spin"></lucide-icon>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'DOCUMENT_EDITOR.LOADING_VERSIONS' | translate }}</p>
                  </div>
                } @else if (versionsError()) {
                  <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {{ versionsError() }}
                  </div>
                } @else if (documentVersions().length === 0) {
                  <div class="flex flex-col items-center justify-center py-12 gap-2 text-center">
                    <lucide-icon name="clock" class="h-8 w-8 text-gray-300 dark:text-gray-600"></lucide-icon>
                    <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'DOCUMENT_EDITOR.NO_VERSIONS' | translate }}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">{{ 'DOCUMENT_EDITOR.NO_VERSIONS_DESC' | translate }}</p>
                  </div>
                } @else {
                  <div class="space-y-4">
                    @for (version of documentVersions(); track version.id; let i = $index) {
                      <div
                        [class]="'p-4 border-2 rounded-lg transition-colors ' +
                          (selectedVersions().includes(version.id)
                            ? 'border-[#155347] bg-[#e8f0ee] dark:bg-[#155347]/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-700/40 hover:bg-gray-50 dark:hover:bg-gray-700/70')"
                      >
                        <div class="flex items-start justify-between mb-2">
                          <div>
                            <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100">
                              {{ 'DOCUMENT_EDITOR.VERSION_N' | translate: {n: documentVersions().length - i} }}
                            </h4>
                            <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatVersionDate(version.createdAt) }}</p>
                          </div>
                          <input
                            type="checkbox"
                            [checked]="selectedVersions().includes(version.id)"
                            [disabled]="selectedVersions().length === 2 && !selectedVersions().includes(version.id)"
                            (change)="handleVersionSelect(version.id)"
                            class="mt-1 rounded border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-[#155347] dark:text-emerald-400 focus:ring-[#155347] dark:focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </div>
                        <p class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1">{{ 'DOCUMENT_EDITOR.SAVED_BY' | translate }} {{ version.authorName }}</p>
                        <p class="text-xs text-gray-700 dark:text-gray-400 mb-3">{{ formatVersionSummary(version.summary) }}</p>
                        <div class="flex gap-2">
                          <app-button
                            variant="outline"
                            size="sm"
                            [leftIcon]="true"
                            (onClick)="openVersionPreview(version, i)"
                          >
                            <lucide-icon leftIcon name="eye" class="h-3 w-3"></lucide-icon>
                            {{ 'DOCUMENT_EDITOR.VIEW' | translate }}
                          </app-button>
                          @if (isOwner() && i > 0) {
                            <app-button
                              variant="outline"
                              size="sm"
                              [leftIcon]="true"
                              (onClick)="handleRestore(version.id)"
                            >
                              <lucide-icon leftIcon name="rotate-ccw" class="h-3 w-3"></lucide-icon>
                              {{ 'DOCUMENT_EDITOR.RESTORE' | translate }}
                            </app-button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </aside>
          }

          <!-- Comments Sidebar -->
          @if (showComments()) {
            <aside class="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-xl">
              <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'DOCUMENT_EDITOR.COMMENTS_TITLE' | translate }}</h3>
                  <app-badge customClass="bg-red-500 text-white">{{ comments.length }}</app-badge>
                </div>
                <button (click)="showComments.set(false)" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
                </button>
              </div>

              <!-- <div class="p-4 border-b border-gray-200">
                <textarea
                  [placeholder]="'DOCUMENT_EDITOR.ADD_COMMENT' | translate"
                  [(ngModel)]="newComment"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm resize-none dark:bg-gray-700 dark:text-gray-100"
                  rows="3"
                ></textarea>
                <div class="mt-2 flex justify-end">
                  <app-button
                    size="sm"
                    customClass="bg-[#155347] hover:bg-[#0d3d31]"
                    [leftIcon]="true"
                    (onClick)="addComment()"
                  >
                    <lucide-icon leftIcon name="send" class="h-3 w-3"></lucide-icon>
                    Post
                  </app-button>
                </div>
              </div> -->

              <div class="flex-1 overflow-y-auto p-4 space-y-4">
                @if (comments.length === 0) {
                  <div class="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                    <lucide-icon name="message-square" class="h-10 w-10 mb-3 opacity-50"></lucide-icon>
                    <p class="text-sm">{{ 'DOCUMENT_EDITOR.NO_COMMENTS' | translate }}</p>
                    <p class="text-xs mt-1 text-gray-400 dark:text-gray-600">{{ 'DOCUMENT_EDITOR.NO_COMMENTS_HINT' | translate }}</p>
                  </div>
                }
                @for (comment of comments; track comment.id) {
                  @if(!comment.parentCommentId){
                    <div class="space-y-2 rounded-lg transition-all duration-200 p-3" [id]="'comment-' + comment.id" 
                    [ngClass]="{
                      'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-500': activeCommentId() === comment.id,
                      'opacity-50 pointer-events-none': commentDeleting() === comment.id
                    }">
                      @if (commentDeleting() === comment.id) {
                        <div class="flex items-center justify-center py-2">
                          <lucide-icon name="loader-circle" class="h-4 w-4 text-red-500 animate-spin"></lucide-icon>
                          <span class="text-xs text-red-500 ml-2">{{ 'DOCUMENT_EDITOR.DELETING' | translate }}</span>
                        </div>
                      }
                      <div class="flex gap-3">
                        <div
                          class="h-8 w-8 rounded-full text-white flex items-center justify-center text-xs font-medium shrink-0"
                          [style.background-color] = "comment.createdByColor"
                        >
                          {{ this.getInitials(comment.createdByName || '') }}
                        </div>
                        <div class="flex-1">
                          <div class="flex items-center gap-2 mb-1">
                            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{
                              comment.createdByName
                            }}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">{{ this.formatCommentDate(comment.createdAt) }}</span>
                            @if (comment.resolved) {
                              <span class="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                                {{ 'DOCUMENT_EDITOR.RESOLVED_BADGE' | translate }}
                              </span>
                            }
                          </div>
                          <p class="text-sm text-gray-700 dark:text-gray-300 cursor-pointer" (click)="openComment(comment, true)"
                            [ngClass]="{'line-through opacity-50': comment.resolved}"
                          >{{ comment.content }}</p>
                          <div class="flex items-center gap-3 mt-2">
                            @if (canEdit()) {
                            <button class="text-xs text-gray-500 hover:text-[#155347] dark:hover:text-emerald-400"
                              [disabled]="commentDeleting() === comment.id"
                              (click)="toggleReply(comment.id)">
                              {{ 'DOCUMENT_EDITOR.REPLY' | translate }}
                            </button>
                             @if (this.isElligableForCommentResolution(comment)) {
                            <button class="text-xs hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                              [ngClass]="comment.resolved ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'"
                              [disabled]="commentResolving() === comment.id"
                              (click)="resolveComment(comment)">
                              @if (commentResolving() === comment.id) {
                                <lucide-icon name="loader-circle" class="h-3 w-3 animate-spin"></lucide-icon>
                              }
                              {{ (comment.resolved ? 'DOCUMENT_EDITOR.UNRESOLVE' : 'DOCUMENT_EDITOR.RESOLVE') | translate }}
                            </button>
                              <button class="text-xs flex items-center gap-1 transition-colors"
                                [ngClass]="pendingDeleteCommentId === comment.id ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 hover:text-red-600 dark:hover:text-red-400'"
                                [disabled]="commentDeleting() === comment.id"
                                (click)="confirmDeleteComment(comment)">
                                @if (commentDeleting() === comment.id) {
                                  <lucide-icon name="loader-circle" class="h-3 w-3 animate-spin"></lucide-icon>
                                }
                                {{ (pendingDeleteCommentId === comment.id ? 'DOCUMENT_EDITOR.CONFIRM_DELETE_BTN' : 'DOCUMENT_EDITOR.DELETE_COMMENT') | translate }}
                              </button>
                            }
                            }
                          </div>
                          @if (activeReplyId === comment.id) {
                          <div class="mt-3">
                            <textarea
                              [(ngModel)]="replyText"
                              [placeholder]="'DOCUMENT_EDITOR.REPLY_PLACEHOLDER' | translate"
                              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm resize-none dark:bg-gray-700 dark:text-gray-100"
                              rows="2"
                              [disabled]="replyAdding()"
                            ></textarea>

                            <div class="flex justify-end mt-2 gap-2">
                              <button
                                class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                [disabled]="replyAdding()"
                                (click)="toggleReply(comment.id)"
                              >
                                {{ 'DOCUMENT_EDITOR.CANCEL' | translate }}
                              </button>

                              <button
                                class="text-xs bg-[#155347] text-white px-3 py-1 rounded-md hover:bg-[#0d3d31] disabled:opacity-50 flex items-center gap-1"
                                [disabled]="replyAdding() || !replyText.trim()"
                                (click)="addReply(comment)"
                              >
                                @if (replyAdding()) {
                                  <lucide-icon name="loader-circle" class="h-3 w-3 animate-spin"></lucide-icon>
                                }
                                {{ 'DOCUMENT_EDITOR.REPLY' | translate }}
                              </button>
                            </div>
                          </div>
                        }
                        </div>
                      </div>
                      @if (comment.replies && comment.replies.length > 0) {
                      <div class="ml-11 mt-3 space-y-3">
                        @for (reply of comment.replies; track reply.id) {
                          <div class="flex gap-3">
                          <div
                              class="h-8 w-8 rounded-full text-white flex items-center justify-center text-xs font-medium shrink-0"
                              [style.background-color] = "reply.createdByColor"
                            >
                              {{ this.getInitials(reply.createdByName || '') }}
                            </div>
                            <div>
                              <div class="flex items-center gap-2 mb-1">
                                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {{ reply.createdByName }}
                                </span>
                                <span class="text-xs text-gray-500 dark:text-gray-400">
                                  {{ this.formatCommentDate(reply.createdAt) }}
                                </span>
                              </div>
                              <p class="text-sm text-gray-700 dark:text-gray-300">
                                {{ reply.content }}
                              </p>
                            </div>
                          </div>
                        }
                      </div>
                    }
                    </div>
                  }
                  
                }
              </div>
            </aside>
          }
        </div>

        @if (showShareModal() && isTeamOwnerOrTeamAdmin()) {
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
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
              <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'DOCUMENT_EDITOR.RESTORE_TITLE' | translate }}</h2>
                <button (click)="closeRestoreModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                  <lucide-icon name="x" class="h-5 w-5"></lucide-icon>
                </button>
              </div>

              <div class="p-6 space-y-4">
                <div class="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <lucide-icon
                    name="triangle-alert"
                    class="h-5 w-5 text-red-600 shrink-0 mt-0.5"
                  ></lucide-icon>
                  <p class="text-sm text-red-800 dark:text-red-400 font-medium">
                    {{ 'DOCUMENT_EDITOR.RESTORE_WARNING' | translate }}
                  </p>
                </div>

                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ 'DOCUMENT_EDITOR.RESTORE_NOTE' | translate }}
                </p>

                <label class="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="restoreConfirmed"
                    class="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300"
                    >{{ 'DOCUMENT_EDITOR.RESTORE_CONFIRM_CHECK' | translate }}</span
                  >
                </label>
              </div>

              <div
                class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 rounded-b-xl"
              >
                <app-button variant="ghost" (onClick)="closeRestoreModal()">{{ 'COMMON.CANCEL' | translate }}</app-button>
                <app-button
                  (onClick)="confirmRestore()"
                  [disabled]="!restoreConfirmed || isRestoring()"
                  customClass="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {{ isRestoring() ? ('COMMON.LOADING' | translate) : ('DOCUMENT_EDITOR.RESTORE_AND_REPLACE' | translate) }}
                </app-button>
              </div>
            </div>
          </div>
        }
      }
      <!-- End of @else (loading) -->

      <!-- Version Preview Overlay -->
      @if (versionPreview() || versionPreviewLoading()) {
        <div class="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
          <!-- Header -->
          <div class="px-4 md:px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 shrink-0 bg-white dark:bg-gray-800 shadow-sm">
            <button
              (click)="closeVersionPreview()"
              data-testid="version-preview-back"
              class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <lucide-icon name="arrow-left" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
            </button>
            @if (versionPreview(); as v) {
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{{ documentTitle }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatVersionDate(v.createdAt) }} &mdash; {{ v.authorName }}
                </p>
              </div>
              <!-- View mode toggle -->
              <div class="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 shrink-0">
                <button
                  (click)="versionHasPrevious() && diffViewMode.set('diff')"
                  [disabled]="!versionHasPrevious()"
                  [title]="versionHasPrevious() ? '' : ('DOCUMENT_EDITOR.NO_PREV_VERSION' | translate)"
                  [class]="'px-3 py-1 text-xs font-medium rounded-md transition-colors ' + (diffViewMode() === 'diff' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200') + (!versionHasPrevious() ? ' opacity-40 cursor-not-allowed' : '')"
                >
                  {{ 'DOCUMENT_EDITOR.CHANGES' | translate }}
                </button>
                <button
                  (click)="diffViewMode.set('full')"
                  [class]="'px-3 py-1 text-xs font-medium rounded-md transition-colors ' + (diffViewMode() === 'full' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')"
                >
                  {{ 'DOCUMENT_EDITOR.FULL_VERSION' | translate }}
                </button>
              </div>
            } @else {
              <div class="flex items-center gap-2 flex-1">
                <lucide-icon name="loader-circle" class="h-4 w-4 text-[#155347] dark:text-emerald-400 animate-spin"></lucide-icon>
                <span class="text-sm text-gray-500 dark:text-gray-400">{{ 'DOCUMENT_EDITOR.LOADING_VERSION' | translate }}</span>
              </div>
            }
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shrink-0">
              <lucide-icon name="eye" class="h-3 w-3"></lucide-icon>
              {{ 'DOCUMENT_EDITOR.READ_ONLY' | translate }}
            </span>
          </div>
          <!-- Content -->
          <div class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex justify-center px-4 py-8">
            @if (versionPreview(); as v) {
              <div class="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 md:p-12">
                @if (diffViewMode() === 'diff') {
                  @if (!versionHasPrevious()) {
                    <div class="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <lucide-icon name="git-commit-horizontal" class="h-10 w-10 text-gray-300 dark:text-gray-600"></lucide-icon>
                      <p class="text-gray-500 dark:text-gray-400 text-sm">{{ 'DOCUMENT_EDITOR.FIRST_VERSION' | translate }}</p>
                      <button
                        (click)="diffViewMode.set('full')"
                        class="text-xs text-[#155347] dark:text-emerald-400 underline hover:no-underline"
                      >{{ 'DOCUMENT_EDITOR.SWITCH_FULL' | translate }}</button>
                    </div>
                  } @else if (versionDiff()) {
                    <!-- Diff legend -->
                    <div class="flex items-center gap-5 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-wrap text-xs text-gray-600 dark:text-gray-400">
                      <span class="flex items-center gap-1.5">
                        <span class="inline-block w-3 h-3 rounded-sm bg-green-200 dark:bg-green-800"></span>
                        {{ 'DOCUMENT_EDITOR.DIFF_ADDED' | translate }}
                      </span>
                      <span class="flex items-center gap-1.5">
                        <span class="inline-block w-3 h-3 rounded-sm bg-yellow-200 dark:bg-yellow-800"></span>
                        {{ 'DOCUMENT_EDITOR.DIFF_MODIFIED' | translate }}
                      </span>
                      <span class="flex items-center gap-1.5">
                        <span class="inline-block w-3 h-3 rounded-sm bg-red-200 dark:bg-red-800"></span>
                        {{ 'DOCUMENT_EDITOR.DIFF_REMOVED' | translate }}
                      </span>
                    </div>
                    <div [innerHTML]="versionDiff()"></div>
                  }
                } @else {
                  @if (v.contentHtml) {
                    <div class="ql-editor" [innerHTML]="safeHtml(v.contentHtml!)"></div>
                  } @else {
                    <div class="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <lucide-icon name="file-x" class="h-10 w-10 text-gray-300 dark:text-gray-600"></lucide-icon>
                      <p class="text-gray-500 dark:text-gray-400 text-sm">{{ 'DOCUMENT_EDITOR.NO_CONTENT' | translate }}</p>
                    </div>
                  }
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Compare Versions Overlay -->
      @if (showCompareOverlay()) {
        <div class="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
          <!-- Header -->
          <div class="px-4 md:px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 shrink-0 bg-white dark:bg-gray-800 shadow-sm">
            <button
              (click)="closeCompareOverlay()"
              class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <lucide-icon name="arrow-left" class="h-5 w-5 text-gray-600 dark:text-gray-400"></lucide-icon>
            </button>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{{ 'DOCUMENT_EDITOR.COMPARING_VERSIONS' | translate }}</p>
              @if (compareOlderVersion(); as older) {
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ 'DOCUMENT_EDITOR.VERSION_N' | translate: {n: getVersionNumber(older.id)} }}
                  &rarr;
                  {{ 'DOCUMENT_EDITOR.VERSION_N' | translate: {n: getVersionNumber(compareNewerVersion()!.id)} }}
                </p>
              }
            </div>
            <!-- View mode toggle -->
            <div class="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 shrink-0">
              <button
                (click)="compareViewMode.set('diff')"
                [class]="'px-3 py-1 text-xs font-medium rounded-md transition-colors ' + (compareViewMode() === 'diff' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')"
              >
                {{ 'DOCUMENT_EDITOR.UNIFIED_DIFF' | translate }}
              </button>
              <button
                (click)="compareViewMode.set('side')"
                [class]="'px-3 py-1 text-xs font-medium rounded-md transition-colors ' + (compareViewMode() === 'side' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')"
              >
                {{ 'DOCUMENT_EDITOR.SIDE_BY_SIDE' | translate }}
              </button>
            </div>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shrink-0">
              <lucide-icon name="eye" class="h-3 w-3"></lucide-icon>
              {{ 'DOCUMENT_EDITOR.READ_ONLY' | translate }}
            </span>
          </div>
          <!-- Content -->
          <div class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 px-4 py-8">
            @if (compareLoading()) {
              <div class="flex flex-col items-center justify-center py-24 gap-3">
                <lucide-icon name="loader-circle" class="h-6 w-6 text-[#155347] dark:text-emerald-400 animate-spin"></lucide-icon>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'DOCUMENT_EDITOR.LOADING_COMPARISON' | translate }}</p>
              </div>
            } @else if (compareViewMode() === 'diff') {
              <!-- Unified diff -->
              <div class="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 md:p-12">
                <!-- Diff legend -->
                <div class="flex items-center gap-5 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-wrap text-xs text-gray-600 dark:text-gray-400">
                  <span class="flex items-center gap-1.5">
                    <span class="inline-block w-3 h-3 rounded-sm bg-green-200 dark:bg-green-800"></span>
                    {{ 'DOCUMENT_EDITOR.DIFF_ADDED' | translate }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <span class="inline-block w-3 h-3 rounded-sm bg-yellow-200 dark:bg-yellow-800"></span>
                    {{ 'DOCUMENT_EDITOR.DIFF_MODIFIED' | translate }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <span class="inline-block w-3 h-3 rounded-sm bg-red-200 dark:bg-red-800"></span>
                    {{ 'DOCUMENT_EDITOR.DIFF_REMOVED' | translate }}
                  </span>
                </div>
                @if (compareDiffHtml()) {
                  <div [innerHTML]="compareDiffHtml()"></div>
                }
              </div>
            } @else {
              <!-- Side-by-side -->
              <div class="max-w-7xl mx-auto grid grid-cols-2 gap-4">
                <!-- Older version -->
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                  <div class="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {{ 'DOCUMENT_EDITOR.VERSION_N' | translate: {n: getVersionNumber(compareOlderVersion()!.id)} }}
                      <span class="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">{{ 'DOCUMENT_EDITOR.OLDER' | translate }}</span>
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatVersionDate(compareOlderVersion()!.createdAt) }} &mdash; {{ compareOlderVersion()!.authorName }}</p>
                  </div>
                  <div class="p-6 md:p-8 overflow-y-auto flex-1">
                    @if (compareOlderVersion()!.contentHtml) {
                      <div class="ql-editor" [innerHTML]="safeHtml(compareOlderVersion()!.contentHtml!)"></div>
                    } @else {
                      <p class="text-sm text-gray-400 dark:text-gray-500 italic">{{ 'DOCUMENT_EDITOR.NO_CONTENT' | translate }}</p>
                    }
                  </div>
                </div>
                <!-- Newer version -->
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                  <div class="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {{ 'DOCUMENT_EDITOR.VERSION_N' | translate: {n: getVersionNumber(compareNewerVersion()!.id)} }}
                      <span class="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">{{ 'DOCUMENT_EDITOR.NEWER' | translate }}</span>
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatVersionDate(compareNewerVersion()!.createdAt) }} &mdash; {{ compareNewerVersion()!.authorName }}</p>
                  </div>
                  <div class="p-6 md:p-8 overflow-y-auto flex-1">
                    @if (compareNewerVersion()!.contentHtml) {
                      <div class="ql-editor" [innerHTML]="safeHtml(compareNewerVersion()!.contentHtml!)"></div>
                    } @else {
                      <p class="text-sm text-gray-400 dark:text-gray-500 italic">{{ 'DOCUMENT_EDITOR.NO_CONTENT' | translate }}</p>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- AI Summary Modal -->
      @if (showSummaryModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
            <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <lucide-icon name="sparkles" class="h-5 w-5 text-purple-600 dark:text-purple-400"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'DOCUMENT_EDITOR.AI_SUMMARY_TITLE' | translate }}</h2>
              </div>
              <button
                (click)="closeSummaryModal()"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              >
                &times;
              </button>
            </div>

            <div class="p-6">
              @if (summaryLoading()) {
                <div class="flex flex-col items-center justify-center py-8 gap-3">
                  <lucide-icon
                    name="loader-circle"
                    class="h-8 w-8 text-purple-600 dark:text-purple-400 animate-spin"
                  ></lucide-icon>
                  <p class="text-gray-600 dark:text-gray-400 text-sm">{{ 'DOCUMENT_EDITOR.GENERATING_SUMMARY' | translate }}</p>
                </div>
              } @else if (summaryError()) {
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div class="flex items-center gap-2 text-red-700 mb-1">
                    <lucide-icon name="circle-alert" class="h-5 w-5"></lucide-icon>
                    <span class="font-medium">{{ 'DOCUMENT_EDITOR.ERROR' | translate }}</span>
                  </div>
                  <p class="text-sm text-red-600">{{ summaryError() }}</p>
                </div>
              } @else {
                <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <p class="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {{ summaryResult() }}
                  </p>
                </div>
              }
            </div>

            <div
              class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 rounded-b-xl"
            >
              @if (!summaryLoading() && !summaryError()) {
                <app-button variant="outline" size="sm" (onClick)="copySummary()">
                  @if (summaryCopied()) {
                    <lucide-icon name="check" class="h-4 w-4 mr-1 text-green-600"></lucide-icon>
                    {{ 'DOCUMENT_EDITOR.COPIED' | translate }}
                  } @else {
                    <lucide-icon name="clipboard" class="h-4 w-4 mr-1"></lucide-icon>
                    {{ 'DOCUMENT_EDITOR.COPY' | translate }}
                  }
                </app-button>
              }
              <app-button variant="ghost" (onClick)="closeSummaryModal()">{{ 'DOCUMENT_EDITOR.CLOSE' | translate }}</app-button>
            </div>
          </div>
        </div>
      }

      <!-- AI Generate Content Panel Modal -->
      @if (showGeneratePanelModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
            <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <lucide-icon name="sparkles" class="h-5 w-5 text-blue-600 dark:text-blue-400"></lucide-icon>
                <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'DOCUMENT_EDITOR.GENERATE_CONTENT' | translate }}</h2>
              </div>
              <button
                (click)="closeGeneratePanelModal()"
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              >
                &times;
              </button>
            </div>

            <div class="p-6">
              <!-- Prompt input (shown before generation) -->
              @if (!generateLoading() && !generateResult() && !generateError()) {
                <textarea
                  [(ngModel)]="generatePrompt"
                  [placeholder]="'DOCUMENT_EDITOR.GENERATE_PROMPT' | translate"
                  rows="4"
                  class="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-400 resize-none placeholder:text-gray-400"
                ></textarea>
                @if (contextFiles().length > 0) {
                  <p class="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <lucide-icon name="file-stack" class="h-3.5 w-3.5"></lucide-icon>
                    {{ 'DOCUMENT_EDITOR.CONTEXT_FILES_HINT' | translate: { count: contextFiles().length } }}
                  </p>
                }
              }

              <!-- Loading -->
              @if (generateLoading()) {
                <div class="flex flex-col items-center justify-center py-8 gap-3">
                  <lucide-icon name="loader-circle" class="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin"></lucide-icon>
                  <p class="text-gray-600 dark:text-gray-400 text-sm">{{ 'DOCUMENT_EDITOR.GENERATING' | translate }}</p>
                </div>
              }

              <!-- Error -->
              @if (generateError()) {
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div class="flex items-center gap-2 text-red-700 mb-1">
                    <lucide-icon name="circle-alert" class="h-5 w-5"></lucide-icon>
                    <span class="font-medium">{{ 'DOCUMENT_EDITOR.ERROR' | translate }}</span>
                  </div>
                  <p class="text-sm text-red-600">{{ generateError() }}</p>
                </div>
              }

              <!-- Result -->
              @if (!generateLoading() && !generateError() && generateResult()) {
                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p class="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{{ generateResult() }}</p>
                </div>
              }
            </div>

            <div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 rounded-b-xl">
              @if (!generateLoading() && !generateResult() && !generateError()) {
                <app-button
                  variant="primary"
                  size="sm"
                  (onClick)="submitGeneratePrompt()"
                  [disabled]="!generatePrompt.trim()"
                >
                  <lucide-icon name="sparkles" class="h-4 w-4 mr-1"></lucide-icon>
                  {{ 'DOCUMENT_EDITOR.GENERATE_BTN' | translate }}
                </app-button>
              }
              @if (generateError()) {
                <app-button variant="outline" size="sm" (onClick)="resetGeneratePanelModal()">
                  {{ 'DOCUMENT_EDITOR.TRY_AGAIN' | translate }}
                </app-button>
              }
              @if (!generateLoading() && !generateError() && generateResult()) {
                <app-button variant="outline" size="sm" (onClick)="copyGeneratedContent()">
                  @if (generateCopied()) {
                    <lucide-icon name="check" class="h-4 w-4 mr-1 text-green-600"></lucide-icon>
                    {{ 'DOCUMENT_EDITOR.COPIED' | translate }}
                  } @else {
                    <lucide-icon name="clipboard" class="h-4 w-4 mr-1"></lucide-icon>
                    {{ 'DOCUMENT_EDITOR.COPY' | translate }}
                  }
                </app-button>
              }
              <app-button variant="ghost" (onClick)="closeGeneratePanelModal()">{{ 'DOCUMENT_EDITOR.CLOSE' | translate }}</app-button>
            </div>
          </div>
        </div>
      }

      <!-- Work in Progress Modal -->
      <app-work-in-progress [show]="showWipModal()" (close)="showWipModal.set(false)" />

      <!-- AI Improve Inline Card (aparece junto ao texto selecionado) -->
      @if (showImproveModal()) {
        <div
          class="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-purple-100 dark:border-purple-900 w-[400px] flex flex-col animate-in fade-in slide-in-from-top-2"
          [style.top.px]="improveCardPosition().top"
          [style.left.px]="improveCardPosition().left"
          style="max-height: 360px;"
        >
          <!-- Card Header -->
          <div class="px-4 py-3 flex items-center justify-between shrink-0 border-b border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-purple-600 dark:text-purple-400"></lucide-icon>
              </div>
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ 'DOCUMENT_EDITOR.IMPROVE_WITH_AI' | translate }}</span>
            </div>
            <button
              (click)="closeImproveModal()"
              class="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
            </button>
          </div>

          <!-- Card Body -->
          <div class="flex-1 overflow-y-auto">
            @if (improveLoading()) {
              <div class="flex flex-col items-center justify-center py-10 gap-3">
                <lucide-icon name="loader-circle" class="h-6 w-6 text-purple-600 dark:text-purple-400 animate-spin"></lucide-icon>
                <p class="text-xs text-gray-500">{{ 'DOCUMENT_EDITOR.ANALYZING' | translate }}</p>
              </div>
            } @else if (improveError()) {
              <div class="m-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <lucide-icon name="circle-alert" class="h-4 w-4 text-red-500 shrink-0 mt-0.5"></lucide-icon>
                <p class="text-xs text-red-600">{{ improveError() }}</p>
              </div>
            } @else {
              <!-- Split diff view -->
              <div class="divide-y divide-gray-100 dark:divide-gray-700">
                <!-- Original -->
                <div class="px-4 py-3">
                  <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">{{ 'DOCUMENT_EDITOR.ORIGINAL' | translate }}</p>
                  <p class="text-xs text-gray-400 leading-relaxed line-clamp-3 line-through">{{ improveOriginalText() }}</p>
                </div>
                <!-- Sugestão -->
                <div class="px-4 py-3 bg-purple-50/60 dark:bg-purple-900/20">
                  <p class="text-[10px] font-semibold text-purple-500 uppercase tracking-widest mb-1.5">{{ 'DOCUMENT_EDITOR.SUGGESTION' | translate }}</p>
                  <p class="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{{ improveResult() }}</p>
                </div>
              </div>
            }
          </div>

          <!-- Card Footer -->
          @if (!improveLoading() && !improveError() && improveResult()) {
            <div class="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2 shrink-0">
              <button
                (click)="closeImproveModal()"
                class="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {{ 'DOCUMENT_EDITOR.DISCARD' | translate }}
              </button>
              <button
                (click)="copyImprovedText()"
                class="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
              >
                @if (improveCopied()) {
                  <lucide-icon name="check" class="h-3.5 w-3.5 text-green-600"></lucide-icon>
                  <span>{{ 'DOCUMENT_EDITOR.COPIED' | translate }}</span>
                } @else {
                  <lucide-icon name="clipboard" class="h-3.5 w-3.5"></lucide-icon>
                  <span>{{ 'DOCUMENT_EDITOR.COPY' | translate }}</span>
                }
              </button>
              <button
                (click)="applyImprovedText()"
                class="px-3 py-1.5 text-xs bg-[#155347] text-white rounded-lg hover:bg-[#0d3d31] transition-colors flex items-center gap-1.5"
              >
                <lucide-icon name="check" class="h-3.5 w-3.5"></lucide-icon>
                <span>{{ 'DOCUMENT_EDITOR.APPLY' | translate }}</span>
              </button>
            </div>
          }
        </div>
      }

      <!-- AI Generate Content Inline Card -->
      @if (showGenerateCard()) {
        <div
          class="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-blue-100 dark:border-blue-900 w-[440px] flex flex-col animate-in fade-in slide-in-from-top-2"
          [style.top.px]="generateCardPosition().top"
          [style.left.px]="generateCardPosition().left"
          style="max-height: 420px;"
        >
          <!-- Card Header -->
          <div class="px-4 py-3 flex items-center justify-between shrink-0 border-b border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"></lucide-icon>
              </div>
              <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ 'DOCUMENT_EDITOR.GENERATE_WITH_AI' | translate }}</span>
            </div>
            <button
              (click)="closeGenerateCard()"
              class="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                [placeholder]="'DOCUMENT_EDITOR.GENERATE_PROMPT' | translate"
                rows="3"
                class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none placeholder:text-gray-400"
                (keydown.enter)="onGenerateKeydown($event)"
              ></textarea>
              <div class="flex items-center justify-between mt-3">
                <p class="text-[10px] text-gray-400">
                  @if (contextFiles().length > 0) {
                    <lucide-icon name="file-stack" class="h-3 w-3 inline-block mr-0.5 -mt-0.5"></lucide-icon>
                    {{ 'DOCUMENT_EDITOR.CONTEXT_FILES_HINT' | translate: { count: contextFiles().length } }}
                  }
                </p>
                <button
                  (click)="submitGeneratePrompt()"
                  [disabled]="!generatePrompt.trim()"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#155347] text-white rounded-lg hover:bg-[#0d3d31] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <lucide-icon name="sparkles" class="h-3.5 w-3.5"></lucide-icon>
                  {{ 'DOCUMENT_EDITOR.GENERATE_BTN' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- Loading State -->
          @if (generateLoading()) {
            <div class="flex flex-col items-center justify-center py-10 gap-3">
              <lucide-icon name="loader-circle" class="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin"></lucide-icon>
              <p class="text-xs text-gray-500">{{ 'DOCUMENT_EDITOR.GENERATING' | translate }}</p>
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
                {{ 'DOCUMENT_EDITOR.TRY_AGAIN' | translate }}
              </button>
            </div>
          }

          <!-- Result State -->
          @if (!generateLoading() && !generateError() && generateResult()) {
            <div class="flex-1 overflow-y-auto">
              <div class="px-4 py-3 bg-blue-50/60 dark:bg-blue-900/20">
                <p class="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-1.5">{{ 'DOCUMENT_EDITOR.GENERATED_CONTENT' | translate }}</p>
                <p class="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{{ generateResult() }}</p>
              </div>
            </div>
            <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
              <button
                (click)="closeGenerateCard()"
                class="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {{ 'DOCUMENT_EDITOR.DISCARD' | translate }}
              </button>
              <button
                (click)="copyGeneratedContent()"
                class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                @if (generateCopied()) {
                  <lucide-icon name="check" class="h-3.5 w-3.5 text-green-600"></lucide-icon>
                  <span>{{ 'DOCUMENT_EDITOR.COPIED' | translate }}</span>
                } @else {
                  <lucide-icon name="clipboard" class="h-3.5 w-3.5"></lucide-icon>
                  <span>{{ 'DOCUMENT_EDITOR.COPY' | translate }}</span>
                }
              </button>
              <button
                (click)="insertGeneratedContent()"
                class="px-3 py-1.5 text-xs bg-[#155347] text-white rounded-lg hover:bg-[#0d3d31] transition-colors flex items-center gap-1.5"
              >
                <lucide-icon name="check" class="h-3.5 w-3.5"></lucide-icon>
                <span>{{ 'DOCUMENT_EDITOR.INSERT' | translate }}</span>
              </button>
            </div>
          }
        </div>
      }

      <!-- Inline Comment Box -->
      @if (showInlineCommentBox()) {
        <div
          class="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 w-64 flex flex-col gap-2"
          [style.top.px]="inlineCommentPosition().top"
          [style.left.px]="inlineCommentPosition().left"
        >
          <textarea
            #inlineCommentInput
            [(ngModel)]="inlineCommentText"
            (input)="updateInlineMentionSuggestions()"
            (click)="updateInlineMentionSuggestions()"
            (keyup)="updateInlineMentionSuggestions()"
            (keydown)="onInlineCommentKeydown($event)"
            [placeholder]="'DOCUMENT_EDITOR.ADD_COMMENT' | translate"
            rows="3"
            class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm resize-none dark:bg-gray-700 dark:text-gray-100"
          ></textarea>
          @if (showInlineMentionList()) {
            <div class="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 shadow-sm">
              @for (suggestion of inlineMentionSuggestions(); track suggestion.id; let i = $index) {
                <button
                  type="button"
                  class="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  [ngClass]="{ 'bg-gray-100 dark:bg-gray-600': i === activeInlineMentionIndex() }"
                  (mousedown)="onInlineMentionMouseDown($event, i)"
                >
                  <span class="font-medium text-gray-800 dark:text-gray-100">{{ suggestion.name }}</span>
                  <span class="text-gray-400 ml-1">@{{ suggestion.tag }}</span>
                </button>
              }
            </div>
          }
          <div class="flex justify-end gap-2">
            <button
              class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              [disabled]="commentAdding()"
              (click)="closeInlineCommentBox()"
            >
              {{ 'DOCUMENT_EDITOR.CANCEL' | translate }}
            </button>
            <button
              class="text-xs bg-[#155347] text-white px-3 py-1 rounded-md hover:bg-[#0d3d31] disabled:opacity-50 flex items-center gap-1"
              [disabled]="commentAdding() || !inlineCommentText.trim()"
              (click)="addInlineComment()"
            >
              @if (commentAdding()) {
                <lucide-icon name="loader-circle" class="h-3 w-3 animate-spin"></lucide-icon>
              }
              {{ 'DOCUMENT_EDITOR.ADD_COMMENT_BTN' | translate }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class DocumentEditorComponent implements OnInit {
  @ViewChild('editor') editor!: TextEditorComponent;
  @ViewChild('contextFileInput') contextFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('inlineCommentInput') inlineCommentInput?: ElementRef<HTMLTextAreaElement>;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private documentService = inject(DocumentService);
  private documentPermissionService = inject(DocumentPermissionService);
  private teamService = inject(TeamService);
  private inviteService = inject(DocumentInviteService);
  private collaborationService = inject(CollaborationService);
  private sanitizer = inject(DomSanitizer);
  private location = inject(Location);
  private translateService = inject(TranslateService);

  // ID do documento atual
  documentId: number | null = null;

  // Estado de carregamento
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  showVersionHistory = signal(false);
  showComments = signal(false);

  // Histórico de versões
  documentVersions = signal<DocumentVersionDto[]>([]);
  versionsLoading = signal(false);
  versionsError = signal<string | null>(null);
  versionPreview = signal<DocumentVersionDetailDto | null>(null);
  versionPreviewLoading = signal(false);
  versionDiff = signal<SafeHtml | null>(null);
  diffViewMode = signal<'diff' | 'full'>('diff');
  versionHasPrevious = signal(false);
  showShareModal = signal(false);
  showAIPanel = signal(false);
  showWipModal = signal(false);
  showMobileMenu = signal(false);
  isRestoreModalOpen = signal(false);
  isRestoring = signal(false);
  versionToRestore = signal<number | null>(null);
  newComment = '';
  selectedVersions = signal<number[]>([]);
  showCompareOverlay = signal(false);
  compareLoading = signal(false);
  compareOlderVersion = signal<DocumentVersionDetailDto | null>(null);
  compareNewerVersion = signal<DocumentVersionDetailDto | null>(null);
  compareDiffHtml = signal<SafeHtml | null>(null);
  compareViewMode = signal<'diff' | 'side'>('diff');
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
  private selectionRange: any = null;

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
  isOwner = signal(false);
  isTeamAdmin = signal(false);

  collaborators: Collaborator[] = [];
  editorUsers = signal<User[]>([]);
  editorUsersByPermissionId = signal<Record<number, User>>({});

  shareRole = signal<number>(0); // 0=Viewer, 1=Editor
  shareExpirationDays = signal<number>(7);
  shareGeneratedUrl = signal<string | null>(null);
  shareLoading = signal(false);
  shareCopied = signal(false);
  documentInvites = signal<DocumentInviteDto[]>([]);
  showInvitesPanel = signal(false);
  lastCopiedInviteId = signal<number | null>(null);

  versions: Version[] = this.documentService.getVersions();
  comments: CommentDto[] = [];
  aiSuggestions: AISuggestion[] = this.documentService.getAISuggestions();

  lastEditedText = signal('Last edited just now');

  // Texto selecionado para adicionar comentário
  showInlineCommentBox = signal(false);
  inlineCommentText = '';
  inlineCommentPosition = signal({ top: 0, left: 0 });
  showInlineMentionList = signal(false);
  inlineMentionSuggestions = signal<Array<{ id: string; name: string; tag: string }>>([]);
  activeInlineMentionIndex = signal(0);
  private inlineMentionRange: { start: number; end: number } | null = null;
  activeCommentId = signal<number | null>(null);

  documentTeamId = signal<number | null>(null);

  // Comment loading states
  commentAdding = signal(false);
  commentDeleting = signal<number | null>(null);
  commentResolving = signal<number | null>(null);
  replyAdding = signal(false);

  //comentários
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  user = this.authService.currentUser;
  activeReplyId: number | null = null;
  replyText: string = '';

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
    //console.log('Loading document with ID:', id);

    this.documentService.getDocument(id).subscribe({
      next: (doc) => {
        this.documentTitle = doc.title;
        this.originalTitle = doc.title;
        this.initialContent = doc.content || '';
        this.lastEdited.set(new Date(doc.updatedAt));
        this.lastEditedText.set(this.formatLastEdited(new Date(doc.updatedAt)));
        this.documentRole.set(doc.role || 'Viewer');
        this.isOwner.set(doc.isOwner ?? false);
        this.isTeamAdmin.set(doc.isTeamAdmin ?? false);
        this.documentTeamId.set(doc.teamId);
        //console.log('Document id & team id:', doc.id, doc.teamId);
        this.loadEditorUsersByPermission(doc.id, doc.teamId);
        this.isLoading.set(false);

        this.documentService.getComments(this.documentId!).subscribe({
          next: (comments) => {
            this.comments = comments;
            this.applyCommentHighlights();
          },
          error: (err) => console.error('Error loading comments:', err)
        });

        // Subscrever eventos de comentários em tempo real via SignalR
        this.collaborationService.commentReceived$.subscribe((comment) => {
          if (comment.parentCommentId) {
            const parent = this.comments.find(c => c.id === comment.parentCommentId);
            if (parent) {
              parent.replies = [...(parent.replies || []), comment];
            }
          } else {
            this.comments = [...this.comments, comment];
            // Delay to let Y.js binding settle before applying format
            setTimeout(() => this.editor.highlightComment(comment), 50);
          }
        });

        this.collaborationService.commentResolved$.subscribe(({ commentId, resolved }) => {
          const comment = this.comments.find(c => c.id === commentId);
          if (comment) comment.resolved = resolved;
        });

        this.collaborationService.commentDeleted$.subscribe((commentId) => {
          this.comments = this.comments.filter(c => c.id !== commentId);
          if (this.activeCommentId() === commentId) this.activeCommentId.set(null);
          this.editor.removeCommentHighlight(commentId);
        });

        // Adicionar event listener ao editor após renderizar
        setTimeout(() => {
          if (this.editor) {
            //console.log('Editor instance:', this.editor);
            const editorRoot = this.editor.getEditorRoot();

            editorRoot.addEventListener('click', (e: MouseEvent) => {
              let el = e.target as HTMLElement;

              while (el && el !== editorRoot) {
                const commentId = el.getAttribute('data-comment-id');

                if (commentId) {
                  const comment = this.comments.find(c => c.id === +commentId);

                  if (comment) {
                    //this.activeCommentId.set(comment.id);  // ✅ ativa aqui
                    this.openComment(comment, false);
                  }

                  return;
                }

                el = el.parentElement!;
              }

              // se clicou fora de um comentário
              this.activeCommentId.set(null);
            });
          }
        }, 0);
        
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

  private loadEditorUsersByPermission(documentId: number, teamId: number): void {
    forkJoin({
      editorPermissions: this.documentPermissionService.getEditorsByDocument(documentId),
      team: this.teamService.getTeamById(teamId),
    }).subscribe({
      next: ({ editorPermissions, team }) => {
        const membersById = new Map(
          (team.members ?? [])
            .filter((member) => member.id != null)
            .map((member) => [member.id as number, member])
        );

        const usersByPermissionId: Record<number, User> = {};
        editorPermissions.forEach((permission) => {
          const member = membersById.get(permission.teamMemberId);
          if (!member) return;

          const userKey = member.userId || member.email || member.name || `${permission.teamMemberId}`;
          usersByPermissionId[permission.id] = {
            id: member.userId,
            email: member.email,
            fullName: member.name,
            userName: member.name,
            initials: this.getInitials(member.name),
            color: this.getUserColor(userKey),
          };
        });

        this.editorUsersByPermissionId.set(usersByPermissionId);
        this.editorUsers.set(Object.values(usersByPermissionId));
        //console.log('Loaded editor users by permission:', usersByPermissionId);
      },
      error: (err) => {
        console.error('Error loading editor users by permission:', err);
        this.editorUsersByPermissionId.set({});
        this.editorUsers.set([]);
      },
    });
  }

  getUserForEditorPermission(permissionId: number): User | null {
    return this.editorUsersByPermissionId()[permissionId] ?? null;
  }

  private getUserColor(key: string): string {
    const palette = ['#155347', '#1D4ED8', '#0F766E', '#B45309', '#7C3AED', '#BE185D', '#0E7490'];
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash * 31 + key.charCodeAt(i)) | 0;
    }
    return palette[Math.abs(hash) % palette.length];
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
    if (!this.documentId || !this.isTeamOwnerOrTeamAdmin()) return;
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

    if (diffMins < 1) return this.translateService.instant('DOCUMENT_EDITOR.LAST_EDITED_JUST_NOW');
    if (diffMins < 60) return this.translateService.instant(diffMins === 1 ? 'DOCUMENT_EDITOR.LAST_EDITED_MINUTE' : 'DOCUMENT_EDITOR.LAST_EDITED_MINUTES', { count: diffMins });
    if (diffHours < 24) return this.translateService.instant(diffHours === 1 ? 'DOCUMENT_EDITOR.LAST_EDITED_HOUR' : 'DOCUMENT_EDITOR.LAST_EDITED_HOURS', { count: diffHours });
    if (diffDays === 1) return this.translateService.instant('DOCUMENT_EDITOR.LAST_EDITED_YESTERDAY');
    return this.translateService.instant('DOCUMENT_EDITOR.LAST_EDITED_DAYS', { count: diffDays });
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
    this.lastEditedText.set(this.translateService.instant('DOCUMENT_EDITOR.LAST_EDITED_JUST_NOW'));
  }

  onContentChange(_content: string): void {
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
    const opening = !this.showVersionHistory();
    this.showVersionHistory.set(opening);
    this.showComments.set(false);
    this.showAIPanel.set(false);
    if (opening && this.documentId) {
      this.loadVersions();
    }
  }

  loadVersions(): void {
    if (!this.documentId) return;
    this.versionsLoading.set(true);
    this.versionsError.set(null);
    this.documentService.getDocumentVersions(this.documentId).subscribe({
      next: (versions) => {
        this.documentVersions.set(versions);
        this.versionsLoading.set(false);
      },
      error: (err) => {
        this.versionsError.set(err.error?.message || 'Error loading versions.');
        this.versionsLoading.set(false);
      }
    });
  }

  openVersionPreview(version: DocumentVersionDto, index: number): void {
    if (!this.documentId) return;
    this.versionPreviewLoading.set(true);
    this.versionPreview.set(null);
    this.versionDiff.set(null);

    const versions = this.documentVersions();
    const previousVersion = versions[index + 1]; // list is DESC, so index+1 is the prior version
    const hasPrevious = !!previousVersion;
    this.versionHasPrevious.set(hasPrevious);
    this.diffViewMode.set(hasPrevious ? 'diff' : 'full');

    const current$ = this.documentService.getDocumentVersionDetail(this.documentId, version.id);

    if (hasPrevious) {
      const previous$ = this.documentService.getDocumentVersionDetail(this.documentId, previousVersion.id);
      forkJoin({ current: current$, previous: previous$ }).subscribe({
        next: ({ current, previous }) => {
          this.versionPreview.set(current);
          const diffHtml = this.computeVersionDiff(previous.contentHtml, current.contentHtml);
          this.versionDiff.set(this.sanitizer.bypassSecurityTrustHtml(diffHtml));
          this.versionPreviewLoading.set(false);
        },
        error: () => this.versionPreviewLoading.set(false),
      });
    } else {
      current$.subscribe({
        next: (current) => {
          this.versionPreview.set(current);
          this.versionPreviewLoading.set(false);
        },
        error: () => this.versionPreviewLoading.set(false),
      });
    }
  }

  closeVersionPreview(): void {
    this.versionPreview.set(null);
    this.versionDiff.set(null);
    this.versionHasPrevious.set(false);
  }

  safeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private htmlToText(html: string): string {
    const withBreaks = html
      .replace(/<img[^>]*>/gi, '[image]\n')    // placeholder visível para imagens
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n');
    const el = document.createElement('div');
    el.innerHTML = withBreaks;
    return (el.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  private computeVersionDiff(oldHtml: string | null, newHtml: string | null): string {
    const oldText = this.htmlToText(oldHtml ?? '');
    const newText = this.htmlToText(newHtml ?? '');
    const parts = diffWords(oldText, newText);

    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

    let html = '<div style="font-size:15px;line-height:1.8;word-break:break-word;">';
    let i = 0;
    while (i < parts.length) {
      const part = parts[i];
      const next = parts[i + 1];
      if (part.removed && next?.added) {
        html += `<mark style="background:#fee2e2;color:#991b1b;text-decoration:line-through;border-radius:2px;padding:0 2px;">${esc(part.value)}</mark>`;
        html += `<mark style="background:#fef9c3;color:#854d0e;border-radius:2px;padding:0 2px;">${esc(next.value)}</mark>`;
        i += 2;
      } else if (part.added) {
        html += `<mark style="background:#dcfce7;color:#166534;border-radius:2px;padding:0 2px;">${esc(part.value)}</mark>`;
        i++;
      } else if (part.removed) {
        html += `<mark style="background:#fee2e2;color:#991b1b;text-decoration:line-through;border-radius:2px;padding:0 2px;">${esc(part.value)}</mark>`;
        i++;
      } else {
        html += esc(part.value);
        i++;
      }
    }
    html += '</div>';
    return html;
  }

  formatVersionSummary(summary: string): string {
    if (!summary) return '';
    if (summary.startsWith('RESTORED_BY|')) {
      const name = summary.substring('RESTORED_BY|'.length);
      return this.translateService.instant('DOCUMENT_EDITOR.SUMMARY_RESTORED_BY', { name });
    }
    if (summary.startsWith('Session by ')) {
      const name = summary.slice('Session by '.length);
      return this.translateService.instant('DOCUMENT_EDITOR.SESSION_BY') + ' ' + name;
    }
    if (summary.startsWith('RESTORED_BY|')) {
      const name = summary.substring('RESTORED_BY|'.length);
      return this.translateService.instant('DOCUMENT_EDITOR.SUMMARY_RESTORED_BY', { name });
    }
    return summary;
  }

  formatVersionDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-PT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  closeCompareOverlay(): void {
    this.showCompareOverlay.set(false);
    this.compareOlderVersion.set(null);
    this.compareNewerVersion.set(null);
    this.compareDiffHtml.set(null);
    this.selectedVersions.set([]);
  }

  getVersionNumber(id: number): number {
    const versions = this.documentVersions();
    const index = versions.findIndex((v) => v.id === id);
    return index === -1 ? 0 : versions.length - index;
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
    if (!this.documentId || this.selectedVersions().length !== 2) return;

    const allVersions = this.documentVersions();
    const [idA, idB] = this.selectedVersions();

    // Determinar qual é a versão mais antiga (índice maior = mais antiga na lista DESC)
    const idxA = allVersions.findIndex(v => v.id === idA);
    const idxB = allVersions.findIndex(v => v.id === idB);
    const olderVersionId = idxA > idxB ? idA : idB;
    const newerVersionId = idxA > idxB ? idB : idA;

    this.compareLoading.set(true);
    this.compareOlderVersion.set(null);
    this.compareNewerVersion.set(null);
    this.compareDiffHtml.set(null);
    this.compareViewMode.set('diff');
    this.showCompareOverlay.set(true);

    const older$ = this.documentService.getDocumentVersionDetail(this.documentId, olderVersionId);
    const newer$ = this.documentService.getDocumentVersionDetail(this.documentId, newerVersionId);

    forkJoin({ older: older$, newer: newer$ }).subscribe({
      next: ({ older, newer }) => {
        this.compareOlderVersion.set(older);
        this.compareNewerVersion.set(newer);
        const diffHtml = this.computeVersionDiff(older.contentHtml, newer.contentHtml);
        this.compareDiffHtml.set(this.sanitizer.bypassSecurityTrustHtml(diffHtml));
        this.compareLoading.set(false);
      },
      error: () => this.compareLoading.set(false),
    });
  }

  handleRestore(versionId: number): void {
    this.versionToRestore.set(versionId);
    this.isRestoreModalOpen.set(true);
  }

  closeRestoreModal(): void {
    this.isRestoreModalOpen.set(false);
    this.restoreConfirmed = false;
  }

  confirmRestore(): void {
    if (!this.restoreConfirmed || !this.versionToRestore() || !this.documentId) return;

    this.isRestoring.set(true);
    this.documentService.restoreDocumentVersion(this.documentId, this.versionToRestore()!).subscribe({
      next: () => {
        this.isRestoring.set(false);
        this.closeRestoreModal();
        this.closeVersionPreview();
        this.showVersionHistory.set(false);
        this.collaborationService.reconnectAfterRestore();
      },
      error: (err) => {
        this.isRestoring.set(false);
        console.error('Error restoring version:', err);
      }
    });
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

  handleAIAction(_actionId: number): void {
    this.aiGenerating.set(true);
    setTimeout(() => this.aiGenerating.set(false), 2000);
  }

  // AI Improve Text
  onSelectionChange(event: { text: string; bounds: { top: number; left: number; width: number; height: number } | null }): void {
    if (event.text && event.text.trim().length > 0 && event.bounds) {
      this.selectedTextForImprove = event.text;
      this.selectionBounds = event.bounds;
      // Guardar o range da seleção para uso posterior em comentários
      this.selectionRange = this.editor.getSelectedRange();
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


  //---------------- comentarios------------------
  addCommentSelection(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.documentId || !this.selectedTextForImprove.trim()) return;

    this.showImproveTooltip.set(false);
    //this.showComments.set(true);

    this.showInlineCommentBox.set(true);
    this.inlineCommentText = ''; // limpar
    this.hideInlineMentionSuggestions();

  // Posicionar a caixa próxima da seleção
    if (this.selectionBounds) {
      this.inlineCommentPosition.set({
        top: this.selectionBounds.top + this.selectionBounds.height + 4, // logo abaixo do texto
        left: this.selectionBounds.left,
      });
    }
  }

  openComment(comment: CommentDto, selectedfromSide : boolean) {
    this.activeCommentId.set(comment.id);
    this.showComments.set(true);
    setTimeout(() => {
      const el = document.getElementById(`comment-${comment.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if(selectedfromSide){
        this.editor.selectCommentHighlight(comment.id)
      }
    }, 50);
  }

  toggleReply(commentId: number) {
    if (this.activeReplyId === commentId) {
      this.activeReplyId = null;
      this.replyText = '';
    } else {
      this.activeReplyId = commentId;
      this.activeCommentId.set(null);
    }
  }

  addReply(parent: CommentDto) {
    if (!this.replyText.trim()) return;
    this.replyAdding.set(true);

    const reply: CreateCommentDto = {
      userId: this.user()?.id,
      documentId: this.documentId!,
      createdByColor: this.user()?.color,
      content: this.replyText.trim(),
      parentCommentId: parent.id
    };

    this.documentService.createComment(reply, this.documentId!).pipe(
      switchMap((createdReply) => {
        this.replyText = '';
        this.activeReplyId = null;
        this.collaborationService.sendComment(this.documentId!, createdReply);
        return this.documentService.getComments(this.documentId!);
      })
    ).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.replyAdding.set(false);
        this.toastService.success(this.translateService.instant('DOCUMENT_EDITOR.REPLY_ADDED'));
      },
      error: (err) => {
        this.replyAdding.set(false);
        this.toastService.error(this.translateService.instant('DOCUMENT_EDITOR.COMMENT_ERROR'));
        console.error('Error adding reply:', err);
      }
    });
  }

  addInlineComment(): void {
    if (!this.inlineCommentText.trim()) return;

    const selectedRange = this.selectionRange;
    if (!selectedRange || selectedRange.length === 0) {
      this.closeInlineCommentBox();
      return;
    }

    const commentContent = this.inlineCommentText.trim();
    const mentionedUserIds = this.getMentionedEditorUserIds(commentContent);

    const newComment: CreateCommentDto = {
      userId: this.user()?.id,
      documentId: this.documentId!,
      createdByColor: this.user()?.color,
      content: commentContent,
      rangeIndex: selectedRange.index,
      rangeLength: selectedRange.length,
      mentionedUserIds,
    };
    //console.log('Creating comment with range:', newComment);
    
    this.commentAdding.set(true);
    this.documentService.createComment(newComment, this.documentId!).pipe(
      switchMap((comment) => {
        this.closeInlineCommentBox();
        this.collaborationService.sendComment(this.documentId!, comment);
        return this.documentService.getComments(this.documentId!);
      })
    ).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.commentAdding.set(false);
        // Re-apply highlights after a microtask so Y.js binding has settled
        setTimeout(() => this.applyCommentHighlights(), 50);
        this.toastService.success(this.translateService.instant('DOCUMENT_EDITOR.COMMENT_ADDED'));
      },
      error: (err) => {
        this.commentAdding.set(false);
        this.toastService.error(this.translateService.instant('DOCUMENT_EDITOR.COMMENT_ERROR'));
        console.error('Error creating comment:', err);
      }
    });
  }

  closeInlineCommentBox(): void {
    this.showInlineCommentBox.set(false);
    this.inlineCommentText = '';
    this.hideInlineMentionSuggestions();
  }

 /*  onInlineCommentInput(): void {
    this.updateInlineMentionSuggestions();
  } */

  onInlineCommentKeydown(event: KeyboardEvent): void {
    if (!this.showInlineMentionList()) return;

    const maxIndex = this.inlineMentionSuggestions().length - 1;
    if (maxIndex < 0) {
      this.hideInlineMentionSuggestions();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeInlineMentionIndex.set(Math.min(this.activeInlineMentionIndex() + 1, maxIndex));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeInlineMentionIndex.set(Math.max(this.activeInlineMentionIndex() - 1, 0));
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      this.selectInlineMention(this.activeInlineMentionIndex());
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.hideInlineMentionSuggestions();
    }
  }

  onInlineMentionMouseDown(event: MouseEvent, index: number): void {
    event.preventDefault();
    this.selectInlineMention(index);
  }

  updateInlineMentionSuggestions(): void {
    const textarea = this.inlineCommentInput?.nativeElement;
    if (!textarea) {
      this.hideInlineMentionSuggestions();
      return;
    }

    const text = this.inlineCommentText ?? '';
    const caretIndex = textarea.selectionStart ?? text.length;
    const beforeCaret = text.slice(0, caretIndex);
    const atIndex = beforeCaret.lastIndexOf('@');

    if (atIndex < 0) {
      this.hideInlineMentionSuggestions();
      return;
    }

    const query = beforeCaret.slice(atIndex + 1);
    if (/\s/.test(query)) {
      this.hideInlineMentionSuggestions();
      return;
    }

    // Garantir que temos os dados mais recentes dos utilizadores com permissão para mencionar
    this.loadEditorUsersByPermission(this.documentId!, this.documentTeamId()!);
    
    const normalizedQuery = this.normalizeMentionTag(query);
    const suggestions = this.getInlineMentionCandidates().filter((candidate) => {
      const tagKey = this.normalizeMentionTag(candidate.tag);
      const nameKey = this.normalizeMentionTag(candidate.name);
      if (!normalizedQuery) return true;
      return tagKey.startsWith(normalizedQuery) || nameKey.includes(normalizedQuery);
    });

    if (suggestions.length === 0) {
      this.hideInlineMentionSuggestions();
      return;
    }

    this.inlineMentionRange = { start: atIndex, end: caretIndex };
    this.inlineMentionSuggestions.set(suggestions);
    this.activeInlineMentionIndex.set(0);
    this.showInlineMentionList.set(true);
  }

  private selectInlineMention(index: number): void {
    const suggestions = this.inlineMentionSuggestions();
    const suggestion = suggestions[index];
    const range = this.inlineMentionRange;
    if (!suggestion || !range) return;

    const text = this.inlineCommentText;
    const mentionText = `@${suggestion.tag}`;
    const needsSpace = range.end >= text.length || !/\s/.test(text.charAt(range.end));
    const suffix = needsSpace ? ' ' : '';
    const nextText = `${text.slice(0, range.start)}${mentionText}${suffix}${text.slice(range.end)}`;
    const nextCaret = range.start + mentionText.length + suffix.length;

    this.inlineCommentText = nextText;
    this.hideInlineMentionSuggestions();

    setTimeout(() => {
      const textarea = this.inlineCommentInput?.nativeElement;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    }, 0);
  }

  private hideInlineMentionSuggestions(): void {
    this.showInlineMentionList.set(false);
    this.inlineMentionSuggestions.set([]);
    this.activeInlineMentionIndex.set(0);
    this.inlineMentionRange = null;
  }

  private getInlineMentionCandidates(): Array<{ id: string; name: string; tag: string }> {
    const seen = new Set<string>();
    const candidates: Array<{ id: string; name: string; tag: string }> = [];

    this.editorUsers().forEach((editor) => {
      const id = editor.id;
      if (!id || seen.has(id)) return;

      const name = editor.fullName || editor.userName || editor.email;
      if (!name) return;

      const tag = name.replace(/[^a-zA-Z0-9]/g, '');
      if (!tag) return;

      candidates.push({ id, name, tag });
      seen.add(id);
    });

    return candidates;
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .join('')
      .slice(0, 2);
  }

  resolveComment(comment: CommentDto): void {
    if (!this.documentId || this.commentResolving() !== null) return;
    this.commentResolving.set(comment.id);
    this.documentService.resolveComment(this.documentId, comment.id).subscribe({
      next: (updated) => {
        comment.resolved = updated.resolved;
        this.commentResolving.set(null);
        this.collaborationService.sendCommentResolved(this.documentId!, comment.id, updated.resolved ?? false);
        this.toastService.success(this.translateService.instant(
          updated.resolved ? 'DOCUMENT_EDITOR.COMMENT_RESOLVED' : 'DOCUMENT_EDITOR.COMMENT_UNRESOLVED'
        ));
      },
      error: (err) => {
        this.commentResolving.set(null);
        this.toastService.error(this.translateService.instant('DOCUMENT_EDITOR.COMMENT_ERROR'));
        console.error('Error resolving comment:', err);
      }
    });
  }

  confirmDeleteComment(comment: CommentDto): void {
    // Se já está pendente de confirmação, executa a eliminação
    if (this.pendingDeleteCommentId === comment.id) {
      this.deleteComment(comment);
      return;
    }
    // Primeira vez: marcar como pendente (o utilizador tem de clicar novamente)
    this.pendingDeleteCommentId = comment.id;
    this.toastService.warning(this.translateService.instant('DOCUMENT_EDITOR.CONFIRM_DELETE'));
    // Reset ao fim de 3 segundos se não confirmar
    setTimeout(() => {
      if (this.pendingDeleteCommentId === comment.id) {
        this.pendingDeleteCommentId = null;
      }
    }, 3000);
  }

  pendingDeleteCommentId: number | null = null;
  private collaborationIsReady = false;

  deleteComment(comment: CommentDto): void {
    if (!this.documentId) return;
    this.commentDeleting.set(comment.id);
    this.pendingDeleteCommentId = null;
    this.documentService.deleteComment(this.documentId, comment.id).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== comment.id);
        if (this.activeCommentId() === comment.id) this.activeCommentId.set(null);
        this.editor.removeCommentHighlight(comment.id);
        this.commentDeleting.set(null);
        this.collaborationService.sendCommentDeleted(this.documentId!, comment.id);
        this.toastService.success(this.translateService.instant('DOCUMENT_EDITOR.COMMENT_DELETED'));
      },
      error: (err) => {
        this.commentDeleting.set(null);
        this.toastService.error(this.translateService.instant('DOCUMENT_EDITOR.COMMENT_ERROR'));
        console.error('Error deleting comment:', err);
      }
    });
  }

  formatCommentDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return this.translateService.instant('DOCUMENT_EDITOR.COMMENT_JUST_NOW');
    if (diffMins < 60) return this.translateService.instant(
      diffMins === 1 ? 'DOCUMENT_EDITOR.COMMENT_MINUTE_AGO' : 'DOCUMENT_EDITOR.COMMENT_MINUTES_AGO',
      { count: diffMins }
    );
    if (diffHours < 24) return this.translateService.instant(
      diffHours === 1 ? 'DOCUMENT_EDITOR.COMMENT_HOUR_AGO' : 'DOCUMENT_EDITOR.COMMENT_HOURS_AGO',
      { count: diffHours }
    );
    if (diffDays === 1) return this.translateService.instant('DOCUMENT_EDITOR.COMMENT_YESTERDAY');
    return this.translateService.instant('DOCUMENT_EDITOR.COMMENT_DAYS_AGO', { count: diffDays });
  }

  /**
   * Returns editor user IDs mentioned in content by @tag.
   * Example: "@AlexMorgan" matches editor "Alex Morgan".
   */
  getMentionedEditorUserIds(content: string): string[] {
    if (!content) return [];

    const editors = this.editorUsers().filter((editor) => !!editor.id);
    if (editors.length === 0) return [];

    const mentionTags = Array.from(content.matchAll(/@([^\s@]+)/g)).map((match) => this.normalizeMentionTag(match[1]));
    if (mentionTags.length === 0) return [];

    const userIdsByTag = new Map<string, string[]>();
    editors.forEach((editor) => {
      const editorId = editor.id;
      if (!editorId) return;

      const candidateTags = [editor.fullName, editor.userName]
        .filter((value): value is string => !!value)
        .map((value) => this.normalizeMentionTag(value))
        .filter((value) => value.length > 0);

      candidateTags.forEach((tag) => {
        const existing = userIdsByTag.get(tag);
        if (existing) {
          if (!existing.includes(editorId)) existing.push(editorId);
        } else {
          userIdsByTag.set(tag, [editorId]);
        }
      });
    });

    const mentionedIds = new Set<string>();
    mentionTags.forEach((tag) => {
      const ids = userIdsByTag.get(tag);
      if (!ids) return;
      ids.forEach((id) => mentionedIds.add(id));
    });

    return Array.from(mentionedIds);
  }

  private normalizeMentionTag(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  isTeamOwnerOrTeamAdmin(): boolean {
    return this.isTeamAdmin() || this.isOwner();
  }

  isMentionedInComment(comment: CommentDto): boolean {
    const userId = this.user()?.id;
    if (!userId) return false;
    
    return comment.mentions?.some(mention => mention.mentionedUserId === userId) ?? false;
  }

  isElligableForCommentResolution(comment: CommentDto): boolean {
    return comment.userId === this.user()?.id || this.isTeamOwnerOrTeamAdmin() || this.isMentionedInComment(comment);
  }

  // ─── Colaboração/Highlights ──────────────────────────────

  /**
   * Chamado quando o text-editor emite `collaborationReady` (Y.js binding activo).
   * Aplica/re-aplica os highlights dos comentários e limpa highlights órfãos.
   */
  onCollaborationReady(): void {
    this.collaborationIsReady = true;
    this.applyCommentHighlights();
    this.cleanOrphanedHighlights();
  }

  /**
   * Aplica os highlights visuais de todos os comentários carregados.
   * Só executa quando a colaboração (Y.js binding) já está activa,
   * para evitar que o snapshot sobrescreva os formatos.
   */
  private applyCommentHighlights(): void {
    if (!this.collaborationIsReady || !this.comments.length) return;
    this.comments.forEach((comment) => this.editor.highlightComment(comment));
  }

  /**
   * Remove highlights do editor cujo commentId já não existe na lista de comentários.
   * Isto cobre casos em que um comentário foi apagado, o snapshot Y.js ainda tinha
   * o formato guardado, e o utilizador recarregou a página.
   */
  private cleanOrphanedHighlights(): void {
    if (!this.editor) return;
    const root = this.editor.getEditorRoot();
    const validIds = new Set(this.comments.map(c => c.id));
    const elements = root.querySelectorAll('[data-comment-id]');

    const orphanedIds = new Set<number>();
    elements.forEach((el) => {
      const id = parseInt(el.getAttribute('data-comment-id') || '0', 10);
      if (id && !validIds.has(id)) {
        orphanedIds.add(id);
      }
    });

    orphanedIds.forEach((id) => this.editor.removeCommentHighlight(id));
  }

  //---------------- comentarios------------------
}
