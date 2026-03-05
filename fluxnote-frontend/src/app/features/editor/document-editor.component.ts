import { Component, inject, signal, ViewChild, ElementRef, OnInit, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ButtonComponent,
  BadgeComponent,
  WorkInProgressComponent,
} from '../../shared/components/ui';
import { DocumentShareModalComponent } from '../../shared/components/document-share-modal/document-share-modal.component';
import { DocumentService, DocumentInviteService, CollaborationService } from '../../core/services';
import { Collaborator, Version, Comment, AISuggestion, DocumentInviteDto, DocumentContextDto, DocumentVersionDto, DocumentVersionDetailDto } from '../../core/models';
import { TextEditorComponent } from './components/text-editor.component';

import { forkJoin } from 'rxjs';
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
                (onClick)="showWipModal.set(true)" customClass="hidden md:inline-flex"
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
                            <div class="text-xs text-gray-500">
                              {{ 'DOCUMENT_EDITOR.EXPIRES' | translate }} {{ inv.expiresAt | date: 'MMM d, y' }}
                            </div>
                          </div>
                          <button
                            (click)="copyInviteUrl(inv.id, inv.inviteUrl)"
                            class="text-xs font-medium text-gray-700 hover:text-gray-900"
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
                  {{ 'DOCUMENT_EDITOR.IMPROVE_WITH_AI' | translate }}
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
                      {{ 'DOCUMENT_EDITOR.COMPARE_VERSIONS' | translate }}
                    </app-button>
                  </div>
                }

                @if (versionsLoading()) {
                  <div class="flex flex-col items-center justify-center py-12 gap-3">
                    <lucide-icon name="loader-circle" class="h-6 w-6 text-[#155347] dark:text-emerald-400 animate-spin"></lucide-icon>
                    <p class="text-sm text-gray-500">{{ 'DOCUMENT_EDITOR.LOADING_VERSIONS' | translate }}</p>
                  </div>
                } @else if (versionsError()) {
                  <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {{ versionsError() }}
                  </div>
                } @else if (documentVersions().length === 0) {
                  <div class="flex flex-col items-center justify-center py-12 gap-2 text-center">
                    <lucide-icon name="clock" class="h-8 w-8 text-gray-300"></lucide-icon>
                    <p class="text-sm font-medium text-gray-500">{{ 'DOCUMENT_EDITOR.NO_VERSIONS' | translate }}</p>
                    <p class="text-xs text-gray-400">{{ 'DOCUMENT_EDITOR.NO_VERSIONS_DESC' | translate }}</p>
                  </div>
                } @else {
                  <div class="space-y-4">
                    @for (version of documentVersions(); track version.id; let i = $index) {
                      <div
                        [class]="'p-4 border-2 rounded-lg transition-colors ' +
                          (selectedVersions().includes(version.id)
                            ? 'border-[#155347] bg-[#e8f0ee] dark:bg-[#155347]/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600')"
                      >
                        <div class="flex items-start justify-between mb-2">
                          <div>
                            <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100">
                              Version {{ documentVersions().length - i }}
                            </h4>
                            <p class="text-xs text-gray-500">{{ formatVersionDate(version.createdAt) }}</p>
                          </div>
                          <input
                            type="checkbox"
                            [checked]="selectedVersions().includes(version.id)"
                            [disabled]="selectedVersions().length === 2 && !selectedVersions().includes(version.id)"
                            (change)="handleVersionSelect(version.id)"
                            class="mt-1 rounded border-gray-300 text-[#155347] dark:text-emerald-400 focus:ring-[#155347] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </div>
                        <p class="text-xs font-medium text-gray-900 dark:text-gray-100 mb-1">{{ version.authorName }} :</p>
                        <p class="text-xs text-gray-700 dark:text-gray-400 mb-3">{{ version.summary }}</p>
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
                          <app-button
                            variant="outline"
                            size="sm"
                            [leftIcon]="true"
                            (onClick)="handleRestore(documentVersions().length - i)"
                          >
                            <lucide-icon leftIcon name="rotate-ccw" class="h-3 w-3"></lucide-icon>
                            {{ 'DOCUMENT_EDITOR.RESTORE' | translate }}
                          </app-button>
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
                  <app-badge customClass="bg-red-500 text-white">2</app-badge>
                </div>
                <button (click)="showComments.set(false)" class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <lucide-icon name="x" class="h-5 w-5 text-gray-500"></lucide-icon>
                </button>
              </div>

              <div class="p-4 border-b border-gray-200 dark:border-gray-700">
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
                        <button class="text-xs text-gray-500 hover:text-[#155347] dark:hover:text-emerald-400 mt-2">
                          {{ 'DOCUMENT_EDITOR.REPLY' | translate }}
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
                  [disabled]="!restoreConfirmed"
                  customClass="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {{ 'DOCUMENT_EDITOR.RESTORE_AND_REPLACE' | translate }}
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
                <p class="text-xs text-gray-500">
                  {{ formatVersionDate(v.createdAt) }} &mdash; {{ v.authorName }}
                </p>
              </div>
              <!-- View mode toggle -->
              <div class="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 shrink-0">
                <button
                  (click)="versionHasPrevious() && diffViewMode.set('diff')"
                  [disabled]="!versionHasPrevious()"
                  [title]="versionHasPrevious() ? '' : ('DOCUMENT_EDITOR.NO_PREV_VERSION' | translate)"
                  [class]="'px-3 py-1 text-xs font-medium rounded-md transition-colors ' + (diffViewMode() === 'diff' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700') + (!versionHasPrevious() ? ' opacity-40 cursor-not-allowed' : '')"
                >
                  {{ 'DOCUMENT_EDITOR.CHANGES' | translate }}
                </button>
                <button
                  (click)="diffViewMode.set('full')"
                  [class]="'px-3 py-1 text-xs font-medium rounded-md transition-colors ' + (diffViewMode() === 'full' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')"
                >
                  {{ 'DOCUMENT_EDITOR.FULL_VERSION' | translate }}
                </button>
              </div>
            } @else {
              <div class="flex items-center gap-2 flex-1">
                <lucide-icon name="loader-circle" class="h-4 w-4 text-[#155347] dark:text-emerald-400 animate-spin"></lucide-icon>
                <span class="text-sm text-gray-500">{{ 'DOCUMENT_EDITOR.LOADING_VERSION' | translate }}</span>
              </div>
            }
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 shrink-0">
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
                      <lucide-icon name="git-commit-horizontal" class="h-10 w-10 text-gray-300"></lucide-icon>
                      <p class="text-gray-500 text-sm">{{ 'DOCUMENT_EDITOR.FIRST_VERSION' | translate }}</p>
                      <button
                        (click)="diffViewMode.set('full')"
                        class="text-xs text-[#155347] dark:text-emerald-400 underline hover:no-underline"
                      >{{ 'DOCUMENT_EDITOR.SWITCH_FULL' | translate }}</button>
                    </div>
                  } @else if (versionDiff()) {
                    <!-- Diff legend -->
                    <div class="flex items-center gap-5 mb-6 pb-4 border-b border-gray-200 flex-wrap text-xs text-gray-600">
                      <span class="flex items-center gap-1.5">
                        <span class="inline-block w-3 h-3 rounded-sm bg-green-200"></span>
                        {{ 'DOCUMENT_EDITOR.DIFF_ADDED' | translate }}
                      </span>
                      <span class="flex items-center gap-1.5">
                        <span class="inline-block w-3 h-3 rounded-sm bg-yellow-200"></span>
                        {{ 'DOCUMENT_EDITOR.DIFF_MODIFIED' | translate }}
                      </span>
                      <span class="flex items-center gap-1.5">
                        <span class="inline-block w-3 h-3 rounded-sm bg-red-200"></span>
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
                      <lucide-icon name="file-x" class="h-10 w-10 text-gray-300"></lucide-icon>
                      <p class="text-gray-500 text-sm">{{ 'DOCUMENT_EDITOR.NO_CONTENT' | translate }}</p>
                    </div>
                  }
                }
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

  formatVersionDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-PT', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
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
      this.showWipModal.set(true);
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
      this.closeVersionPreview();
      this.showVersionHistory.set(false);
      this.showWipModal.set(true);
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

  handleAIAction(_actionId: number): void {
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
