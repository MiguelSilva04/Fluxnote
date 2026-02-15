import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent, ModalComponent } from '../../../shared/components/ui';
import { DocumentService, TeamService, AuthService, FolderService } from '../../../core/services';
import { ToastService } from '../../../shared/services/toast.service';
import { TourService } from '../../../shared/services/tour.service';
import { TourStep } from '../../../shared/components/ui/tour/tour.models';
import { DocumentDto, TeamGet, Folder } from '../../../core/models';

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
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private teamService = inject(TeamService);
  private authService = inject(AuthService);
  private tourService = inject(TourService);
  private folderService = inject(FolderService);
  private toastService = inject(ToastService);

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

  // Folder state
  expandedFolders = signal<Set<number>>(new Set());
  draggingDocId = signal<number | null>(null);
  dragOverTarget = signal<number | 'root' | null>(null);
  dragOverDocId = signal<number | null>(null);

  // Create folder modal
  isCreateFolderModalOpen = signal(false);
  newFolderName = '';

  // Merge-to-folder modal (drag doc onto doc)
  isMergeFolderModalOpen = signal(false);
  mergeDocIds = signal<number[]>([]);
  mergeFolderName = '';

  // Documentos filtrados pela equipa selecionada
  filteredDocuments = computed(() => {
    const teamId = this.selectedTeamFilter();
    const docs = this.documents();
    if (teamId === null) {
      return docs;
    }
    return docs.filter(doc => doc.teamId === teamId);
  });

  filteredTeams = computed(() => {
    const query = this.searchTeamQuery().toLowerCase();
    return this.ownerTeams().filter(team =>
      team.name.toLowerCase().includes(query)
    );
  });

  // Folder computed signals
  selectedTeamFolders = computed(() => {
    const teamId = this.selectedTeamFilter();
    if (teamId === null) return [];
    const team = this.userTeams().find(t => t.id === teamId);
    return team?.folders ?? [];
  });

  folderedDocuments = computed(() => {
    const teamId = this.selectedTeamFilter();
    if (teamId === null) return null;
    const docs = this.filteredDocuments();
    return {
      byFolder: this.selectedTeamFolders()
        .map(folder => ({
          folder,
          documents: docs.filter(d => d.folderId === folder.id)
        })),
      unfoldered: docs.filter(d => !d.folderId)
    };
  });

  canManageFolders = computed(() => {
    const teamId = this.selectedTeamFilter();
    if (teamId === null) return false;
    const team = this.userTeams().find(t => t.id === teamId);
    return team?.currentUserRole === 2 || team?.currentUserRole === 1;
  });

  hasAnyContent = computed(() => {
    return this.filteredDocuments().length > 0 || (this.selectedTeamFilter() !== null && this.selectedTeamFolders().length > 0);
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

  loadUserTeams(silent = false): void {
    if (!silent) this.isLoadingTeamTabs.set(true);
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
    return team?.currentUserRole === 2;
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

  // ── Folder methods ──

  toggleFolder(folderId: number): void {
    this.expandedFolders.update(set => {
      const newSet = new Set(set);
      if (newSet.has(folderId)) newSet.delete(folderId);
      else newSet.add(folderId);
      return newSet;
    });
  }

  isFolderExpanded(folderId: number): boolean {
    return this.expandedFolders().has(folderId);
  }

  openCreateFolderModal(): void {
    const teamId = this.selectedTeamFilter();
    if (!teamId) return;
    this.newFolderName = '';
    this.isCreateFolderModalOpen.set(true);
  }

  createFolder(): void {
    const teamId = this.selectedTeamFilter();
    if (!this.newFolderName.trim() || !teamId) return;

    this.folderService.createFolder(this.newFolderName.trim(), teamId).subscribe({
      next: () => {
        this.isCreateFolderModalOpen.set(false);
        this.newFolderName = '';
        this.toastService.success('Folder created successfully');
        this.loadUserTeams(true);
      },
      error: (err) => {
        console.error('Error creating folder:', err);
        this.toastService.error('Failed to create folder');
      }
    });
  }

  // ── Drag & Drop ──

  onDragStart(event: DragEvent, docId: number): void {
    this.draggingDocId.set(docId);
    event.dataTransfer?.setData('text/plain', String(docId));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragEnd(): void {
    this.draggingDocId.set(null);
    this.dragOverTarget.set(null);
    this.dragOverDocId.set(null);
  }

  onDragOverFolder(event: DragEvent, folderId: number): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverTarget.set(folderId);
  }

  onDragOverRoot(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverTarget.set('root');
  }

  onDragLeave(): void {
    this.dragOverTarget.set(null);
  }

  onDropOnFolder(event: DragEvent, folderId: number): void {
    event.preventDefault();
    this.dragOverTarget.set(null);
    const docId = this.draggingDocId();
    this.draggingDocId.set(null);
    if (!docId || !this.canManageFolders()) return;

    this.folderService.moveDocumentToFolder(folderId, docId).subscribe({
      next: () => {
        this.toastService.success('Document moved to folder');
        this.loadDocuments();
        this.loadUserTeams(true);
      },
      error: (err) => {
        console.error('Error moving document:', err);
        this.toastService.error('Failed to move document');
      }
    });
  }

  onDropOnRoot(event: DragEvent): void {
    event.preventDefault();
    this.dragOverTarget.set(null);
    const docId = this.draggingDocId();
    this.draggingDocId.set(null);
    if (!docId || !this.canManageFolders()) return;

    const doc = this.documents().find(d => d.id === docId);
    if (!doc?.folderId) return;

    this.folderService.removeDocumentFromFolder(doc.folderId, docId).subscribe({
      next: () => {
        this.toastService.success('Document removed from folder');
        this.loadDocuments();
        this.loadUserTeams(true);
      },
      error: (err) => {
        console.error('Error removing from folder:', err);
        this.toastService.error('Failed to remove document from folder');
      }
    });
  }

  // ── Drag doc onto doc (merge to new folder) ──

  onDragOverDocument(event: DragEvent, targetDocId: number): void {
    const dragged = this.draggingDocId();
    if (!dragged || dragged === targetDocId) return;

    const targetDoc = this.documents().find(d => d.id === targetDocId);
    const draggedDoc = this.documents().find(d => d.id === dragged);
    if (targetDoc?.folderId || draggedDoc?.folderId) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverDocId.set(targetDocId);
  }

  onDragLeaveDocument(): void {
    this.dragOverDocId.set(null);
  }

  onDropOnDocument(event: DragEvent, targetDocId: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverTarget.set(null);
    this.dragOverDocId.set(null);

    const draggedDocId = this.draggingDocId();
    this.draggingDocId.set(null);

    if (!draggedDocId || draggedDocId === targetDocId) return;
    if (!this.canManageFolders()) return;

    this.mergeDocIds.set([draggedDocId, targetDocId]);
    this.mergeFolderName = '';
    this.isMergeFolderModalOpen.set(true);
  }

  confirmMergeToFolder(): void {
    const teamId = this.selectedTeamFilter();
    const docIds = this.mergeDocIds();
    if (!this.mergeFolderName.trim() || !teamId || docIds.length < 2) return;

    this.folderService.createFolder(this.mergeFolderName.trim(), teamId).subscribe({
      next: (folder) => {
        this.folderService.moveDocumentToFolder(folder.id, docIds[0]).subscribe({
          next: () => {
            this.folderService.moveDocumentToFolder(folder.id, docIds[1]).subscribe({
              next: () => {
                this.isMergeFolderModalOpen.set(false);
                this.mergeFolderName = '';
                this.mergeDocIds.set([]);
                this.toastService.success('Folder created and documents grouped');
                this.loadDocuments();
                this.loadUserTeams(true);
              },
              error: () => {
                this.toastService.error('Folder created but failed to move one document');
                this.isMergeFolderModalOpen.set(false);
                this.loadDocuments();
                this.loadUserTeams(true);
              }
            });
          },
          error: () => {
            this.toastService.error('Folder created but failed to move documents');
            this.isMergeFolderModalOpen.set(false);
            this.loadDocuments();
            this.loadUserTeams(true);
          }
        });
      },
      error: () => {
        this.toastService.error('Failed to create folder');
      }
    });
  }

  // ── Tour ──

  startTour(): void {
    const steps: TourStep[] = [
    {
      targetSelector: '[data-tour="documents-section"]',
      title: 'Your Documents',
      description:
        'Welcome to FluxNote! This is your Dashboard, where you can view and manage all your documents.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="create-document-btn"]',
      title: 'Create a New Document',
      description:
        'Click here to create a new document. You can assign it to an existing team or create a new team on the spot.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="team-filter-tabs"]',
      title: 'Filter by Team',
      description:
        'Use these tabs to filter your documents by team. Select "All Teams" to see everything.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="sidebar-teams"]',
      title: 'Teams Section',
      description:
        'Go to the Teams page to view all your teams, create new ones and manage their members.',
      position: 'right',
            onActivate: () => {
        this.router.navigate(['/teams']);
      }
    }
  ];
    if (this.userTeams().length > 0) {
      steps.push({
      targetSelector: '[data-tour="team-details"]',
      title: 'Team Details',
      description:
        'Inside each team, you can access Team Details to manage members, assign Team Roles (Owner, Admin, Member) and configure Document Roles (per-document permissions).',
      position: 'right',
    },);
    }

    steps.push(
      {
        targetSelector: '[data-tour="sidebar-profile"]',
        title: 'Your Profile',
        description:
          'Visit your Profile to update your personal information and manage your account settings.',
        position: 'bottom',
        onActivate: () => {
          this.router.navigate(['/profile']);
        }
      }
    );

    this.tourService.start(steps);
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
