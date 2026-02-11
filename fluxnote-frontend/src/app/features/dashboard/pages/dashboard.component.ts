import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent, ModalComponent } from '../../../shared/components/ui';
import { DocumentService, TeamService, AuthService } from '../../../core/services';
import { DocumentDto, TeamGet } from '../../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    BadgeComponent,
    ModalComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">My Documents</h1>
          <p class="text-gray-600">Manage and organize your documents</p>
        </div>
        <app-button (onClick)="openCreateDocumentModal()" [leftIcon]="true" customClass="bg-[#155347] hover:bg-[#0d3d31]">
          <lucide-icon leftIcon name="plus" class="h-4 w-4"></lucide-icon>
          New Document
        </app-button>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <lucide-icon name="loader-circle" class="h-8 w-8 text-[#155347] animate-spin"></lucide-icon>
          <span class="ml-3 text-gray-600">Loading documents...</span>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2 text-red-700">
            <lucide-icon name="circle-alert" class="h-5 w-5"></lucide-icon>
            <span>{{ error() }}</span>
          </div>
        </div>
      }

      <!-- Tabs -->
      @if (!isLoading()) {
        <div class="flex items-center justify-between mb-6">
          <div class="flex gap-1 border-b border-gray-200 overflow-x-auto">
            <!-- All Documents tab -->
            <button
              (click)="selectTeamFilter(null)"
              [class]="'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' + (selectedTeamFilter() === null ? 'border-[#155347] text-[#155347]' : 'border-transparent text-gray-600 hover:text-gray-900')"
            >
              All Teams
            </button>
            <!-- Team tabs -->
            @if (isLoadingTeamTabs()) {
              <div class="flex items-center px-4 py-2">
                <lucide-icon name="loader-circle" class="h-4 w-4 text-gray-400 animate-spin"></lucide-icon>
              </div>
            } @else {
              @for (team of userTeams(); track team.id) {
                <button
                  (click)="selectTeamFilter(team.id)"
                  [class]="'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' + (selectedTeamFilter() === team.id ? 'border-[#155347] text-[#155347]' : 'border-transparent text-gray-600 hover:text-gray-900')"
                >
                  {{ team.name }}
                </button>
              }
            }
          </div>

          <div class="flex items-center gap-2">
            <button
              (click)="viewMode.set('grid')"
              [class]="'p-2 rounded-lg transition-colors ' + (viewMode() === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')"
            >
              <lucide-icon name="grid-3x3" class="h-5 w-5"></lucide-icon>
            </button>
            <button
              (click)="viewMode.set('list')"
              [class]="'p-2 rounded-lg transition-colors ' + (viewMode() === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50')"
            >
              <lucide-icon name="list" class="h-5 w-5"></lucide-icon>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        @if (filteredDocuments().length === 0 && !isLoading()) {
          <div class="text-center py-12">
            <div class="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <lucide-icon name="file-text" class="h-8 w-8 text-gray-400"></lucide-icon>
            </div>
            @if (selectedTeamFilter() === null) {
              <h3 class="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p class="text-gray-600 mb-4">Create your first document to get started</p>
            } @else {
              <h3 class="text-lg font-medium text-gray-900 mb-2">No documents in this team</h3>
              <p class="text-gray-600 mb-4">Create a document for this team</p>
            }
            <app-button (onClick)="openCreateDocumentModal()" customClass="bg-[#155347] hover:bg-[#0d3d31]">
              <lucide-icon name="plus" class="h-4 w-4 mr-2"></lucide-icon>
              Create Document
            </app-button>
          </div>
        }

        <!-- Documents Grid -->
        @if (filteredDocuments().length > 0) {
          <div [class]="viewMode() === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'">
            @for (doc of filteredDocuments(); track doc.id) {
              <app-card customClass="hover:shadow-lg transition-shadow cursor-pointer" (click)="handleDocumentClick(doc.id)">
                <app-card-content customClass="p-6">
                  <div class="flex items-start justify-between mb-4">
                    <div class="p-3 bg-[#e8f0ee] rounded-lg">
                      <lucide-icon name="file-text" class="h-6 w-6 text-[#155347]"></lucide-icon>
                    </div>
                    <!-- Menu dropdown - Only show if user is Owner of the team -->
                    @if (isTeamOwner(doc.teamId)) {
                      <div class="relative">
                        <button 
                          class="p-1 hover:bg-gray-100 rounded" 
                          (click)="toggleDocumentMenu($event, doc.id)"
                        >
                          <lucide-icon name="ellipsis-vertical" class="h-5 w-5 text-gray-400"></lucide-icon>
                        </button>
                        @if (openDocumentMenu() === doc.id) {
                          <div class="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] z-10">
                            <button
                              (click)="handleDuplicateDocument($event, doc.id)"
                              class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <lucide-icon name="copy" class="h-4 w-4"></lucide-icon>
                              Duplicate
                            </button>
                            <button
                              (click)="handleDeleteDocument($event, doc.id)"
                              class="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <lucide-icon name="trash-2" class="h-4 w-4"></lucide-icon>
                              Delete
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                  <h3 class="text-lg font-bold text-gray-900 mb-2">{{ doc.title }}</h3>
                  <div class="flex items-center gap-4 text-sm text-gray-600">
                    <div class="flex items-center gap-1">
                      <lucide-icon name="clock" class="h-4 w-4"></lucide-icon>
                      <span>{{ formatDate(doc.updatedAt) }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <lucide-icon name="users" class="h-4 w-4"></lucide-icon>
                      <span>{{ doc.teamName }}</span>
                    </div>
                  </div>
                </app-card-content>
              </app-card>
            }
          </div>
        }
      }

      <!-- Create Document Modal -->
      @if (isCreateModalOpen()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-900">New Document</h2>
              <button (click)="closeCreateModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div class="p-6 space-y-4">
              <!-- Document Title -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g., Weekly Report..."
                  [(ngModel)]="documentTitle"
                  class="w-full h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] focus:border-transparent text-sm"
                />
              </div>

              <!-- Team Selection Mode Toggle -->
              <div class="flex gap-2">
                <button
                  (click)="createTeamMode.set(false)"
                  [class]="'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ' + (!createTeamMode() ? 'bg-[#155347] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')"
                >
                  Existing Team
                </button>
                <button
                  (click)="createTeamMode.set(true)"
                  [class]="'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ' + (createTeamMode() ? 'bg-[#155347] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')"
                >
                  Create New Team
                </button>
              </div>

              <!-- Existing Team Selection -->
              @if (!createTeamMode()) {
                <div>
                  <p class="text-sm text-gray-600 mb-3">
                    Select a team where you are the owner.
                  </p>

                  <div class="relative mb-3">
                    <lucide-icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
                    <input
                      type="text"
                      placeholder="Search team..."
                      [(ngModel)]="searchTeam"
                      class="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] focus:border-transparent text-sm"
                    />
                  </div>

                  @if (isLoadingTeams()) {
                    <div class="flex items-center justify-center py-8">
                      <lucide-icon name="loader-circle" class="h-6 w-6 text-[#155347] animate-spin"></lucide-icon>
                    </div>
                  } @else if (filteredTeams().length === 0) {
                    <div class="text-center py-8 text-gray-500">
                      <p>No teams available.</p>
                      <button 
                        (click)="createTeamMode.set(true)"
                        class="text-[#155347] hover:underline mt-2"
                      >
                        Create new team
                      </button>
                    </div>
                  } @else {
                    <div class="space-y-2 max-h-48 overflow-y-auto">
                      @for (team of filteredTeams(); track team.id) {
                        <button
                          (click)="selectedTeamId.set(team.id)"
                          [class]="'w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ' + (selectedTeamId() === team.id ? 'border-[#155347] bg-[#e8f0ee]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50')"
                        >
                          <span class="font-medium text-gray-900">{{ team.name }}</span>
                          @if (team.currentUserRole === 2) {
                            <app-badge customClass="bg-[#155347] text-white">Owner</app-badge>
                          }
                        </button>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Create New Team -->
              @if (createTeamMode()) {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">New Team Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Project Alpha..."
                    [(ngModel)]="newTeamName"
                    class="w-full h-10 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] focus:border-transparent text-sm"
                  />
                  <p class="text-xs text-gray-500 mt-2">
                    A new team will be automatically created with you as the owner.
                  </p>
                </div>
              }

              <!-- Error Message -->
              @if (createError()) {
                <div class="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p class="text-sm text-red-700">{{ createError() }}</p>
                </div>
              }
            </div>

            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <app-button variant="ghost" (onClick)="closeCreateModal()">Cancel</app-button>
              <app-button
                (onClick)="handleCreateDocument()"
                [disabled]="!canCreateDocument() || isCreating()"
                customClass="bg-[#155347] hover:bg-[#0d3d31] disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                @if (isCreating()) {
                  <lucide-icon name="loader-circle" class="h-4 w-4 mr-2 animate-spin"></lucide-icon>
                  Creating...
                } @else {
                  Create Document
                }
              </app-button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      <app-modal
        [isOpen]="isDeleteModalOpen()"
        title="Delete Document"
        (onClose)="closeDeleteModal()"
        [hasFooter]="true"
        maxWidth="sm"
      >
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <lucide-icon name="trash-2" class="h-6 w-6 text-red-600"></lucide-icon>
          </div>
          <p class="text-gray-600">
            Are you sure you want to delete this document? This action cannot be undone.
          </p>
        </div>
        <div footer class="flex gap-3 w-full justify-center">
          <app-button variant="ghost" customClass="flex-1 max-w-[120px]" (onClick)="closeDeleteModal()">Cancel</app-button>
          <app-button 
            customClass="flex-1 max-w-[120px] bg-red-600 hover:bg-red-700" 
            (onClick)="confirmDelete()"
            [isLoading]="isDeleting()"
          >
            Delete
          </app-button>
        </div>
      </app-modal>

      <!-- Duplicate Confirmation Modal -->
      <app-modal
        [isOpen]="isDuplicateModalOpen()"
        title="Duplicate Document"
        (onClose)="closeDuplicateModal()"
        [hasFooter]="true"
        maxWidth="sm"
      >
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <lucide-icon name="copy" class="h-6 w-6 text-blue-600"></lucide-icon>
          </div>
          <p class="text-gray-600">
            Are you sure you want to duplicate this document? A new copy will be created with "(Copy)" appended to the title.
          </p>
        </div>
        <div footer class="flex gap-3 w-full justify-center">
          <app-button variant="ghost" customClass="flex-1 max-w-[120px]" (onClick)="closeDuplicateModal()">Cancel</app-button>
          <app-button 
            customClass="flex-1 max-w-[120px] bg-[#155347] hover:bg-[#0d3d31]" 
            (onClick)="confirmDuplicate()"
            [isLoading]="isDuplicating()"
          >
            Duplicate
          </app-button>
        </div>
      </app-modal>
    </app-dashboard-layout>
  `
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private teamService = inject(TeamService);
  private authService = inject(AuthService);

  // View state
  viewMode = signal<'grid' | 'list'>('grid');
  selectedTeamFilter = signal<number | null>(null);
  openDocumentMenu = signal<number | null>(null);

  // Modal state
  isCreateModalOpen = signal(false);
  createTeamMode = signal(false);
  selectedTeamId = signal<number | null>(null);
  documentTitle = '';
  newTeamName = '';
  searchTeamQuery = signal('');

  // Delete modal state
  isDeleteModalOpen = signal(false);
  documentToDelete = signal<number | null>(null);
  isDeleting = signal(false);

  // Duplicate modal state
  isDuplicateModalOpen = signal(false);
  documentToDuplicate = signal<number | null>(null);
  isDuplicating = signal(false);

  // Loading states
  isLoading = this.documentService.isLoading;
  error = this.documentService.error;
  isLoadingTeams = signal(false);
  isLoadingTeamTabs = signal(false);
  isCreating = signal(false);
  createError = signal<string | null>(null);

  // Data
  documents = this.documentService.documents;
  ownerTeams = signal<TeamGet[]>([]);
  userTeams = signal<TeamGet[]>([]);

  // Documentos filtrados pela equipa selecionada
  filteredDocuments = computed(() => {
    const teamId = this.selectedTeamFilter();
    const docs = this.documents();
    if (teamId === null) {
      return docs; // All documents
    }
    return docs.filter(doc => doc.teamId === teamId);
  });

  filteredTeams = computed(() => {
    const query = this.searchTeamQuery().toLowerCase();
    return this.ownerTeams().filter(team =>
      team.name.toLowerCase().includes(query)
    );
  });

  canCreateDocument(): boolean {
    const hasTitle = this.documentTitle.trim().length > 0;
    if (this.createTeamMode()) {
      return hasTitle && this.newTeamName.trim().length > 0;
    }
    return hasTitle && this.selectedTeamId() !== null;
  }

  get searchTeam(): string {
    return this.searchTeamQuery();
  }

  set searchTeam(value: string) {
    this.searchTeamQuery.set(value);
  }

  ngOnInit(): void {
    this.loadDocuments();
    this.loadUserTeams();
  }

  loadDocuments(teamId?: number): void {
    this.documentService.getDocuments(teamId ? { teamId } : undefined).subscribe();
  }

  loadUserTeams(): void {
    this.isLoadingTeamTabs.set(true);
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        this.userTeams.set(teams);
        this.isLoadingTeamTabs.set(false);
      },
      error: (err) => {
        console.error('Error loading teams:', err);
        this.isLoadingTeamTabs.set(false);
      }
    });
  }

  selectTeamFilter(teamId: number | null): void {
    this.selectedTeamFilter.set(teamId);
  }

  loadOwnerTeams(): void {
    this.isLoadingTeams.set(true);
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        // Filtrar apenas equipas onde o utilizador é Owner (currentUserRole === 2)
        const ownerOnlyTeams = teams.filter(team => team.currentUserRole === 2);
        this.ownerTeams.set(ownerOnlyTeams);
        this.isLoadingTeams.set(false);
      },
      error: (err) => {
        console.error('Error loading teams:', err);
        this.isLoadingTeams.set(false);
      }
    });
  }

  openCreateDocumentModal(): void {
    this.isCreateModalOpen.set(true);
    this.createTeamMode.set(false);
    this.documentTitle = '';
    this.newTeamName = '';
    this.selectedTeamId.set(null);
    this.createError.set(null);
    this.loadOwnerTeams();
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    this.documentTitle = '';
    this.newTeamName = '';
    this.selectedTeamId.set(null);
    this.createTeamMode.set(false);
    this.createError.set(null);
  }

  handleCreateDocument(): void {
    if (!this.canCreateDocument()) return;

    this.isCreating.set(true);
    this.createError.set(null);

    const request = {
      title: this.documentTitle.trim(),
      teamId: this.createTeamMode() ? undefined : this.selectedTeamId() ?? undefined,
      teamName: this.createTeamMode() ? this.newTeamName.trim() : undefined
    };

    this.documentService.createDocument(request).subscribe({
      next: (doc) => {
        this.isCreating.set(false);
        this.closeCreateModal();
        // Navegar para o editor com o novo documento
        this.router.navigate(['/editor', doc.id]);
      },
      error: (err) => {
        this.isCreating.set(false);
        const message = err.error?.message || err.error?.errors?.[0] || 'Error creating document';
        this.createError.set(message);
        console.error('Error creating document:', err);
      }
    });
  }

  handleDocumentClick(docId: number): void {
    this.router.navigate(['/editor', docId]);
  }

  toggleDocumentMenu(event: Event, docId: number): void {
    event.stopPropagation();
    this.openDocumentMenu.update(current => current === docId ? null : docId);
  }

  isDocumentOwner(doc: DocumentDto): boolean {
    const currentUser = this.authService.currentUser();
    return currentUser?.id === doc.createdById;
  }

  isTeamOwner(teamId: number): boolean {
    const team = this.userTeams().find(t => t.id === teamId);
    return team?.currentUserRole === 2; // 2 = Owner
  }

  handleDeleteDocument(event: Event, docId: number): void {
    event.stopPropagation();
    this.openDocumentMenu.set(null);
    this.documentToDelete.set(docId);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.documentToDelete.set(null);
  }

  confirmDelete(): void {
    const docId = this.documentToDelete();
    if (!docId) return;

    this.isDeleting.set(true);
    this.documentService.deleteDocument(docId).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
      },
      error: (err) => {
        this.isDeleting.set(false);
        console.error('Error deleting document:', err);
        // Poderia mostrar um toast de erro aqui
      }
    });
  }

  handleDuplicateDocument(event: Event, docId: number): void {
    event.stopPropagation();
    this.openDocumentMenu.set(null);
    this.documentToDuplicate.set(docId);
    this.isDuplicateModalOpen.set(true);
  }

  closeDuplicateModal(): void {
    this.isDuplicateModalOpen.set(false);
    this.documentToDuplicate.set(null);
  }

  confirmDuplicate(): void {
    const docId = this.documentToDuplicate();
    if (!docId) return;

    this.isDuplicating.set(true);
    this.documentService.duplicateDocument(docId).subscribe({
      next: (doc) => {
        this.isDuplicating.set(false);
        this.closeDuplicateModal();
      },
      error: (err) => {
        this.isDuplicating.set(false);
        console.error('Error duplicating document:', err);
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }
}
