import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent, ModalComponent } from '../../../shared/components/ui';
import { DocumentShareModalComponent } from '../../../shared/components/document-share-modal/document-share-modal.component';
import { TeamShareModalComponent } from '../../../shared/components/team-share-modal/team-share-modal.component';
import { TeamService, DocumentPermissionService, AuthService, DocumentInviteService, DocumentService, TeamInviteService, FolderService } from '../../../core/services';
import { ToastService } from '../../../shared/services/toast.service';
import { TourService } from '../../../shared/services/tour.service';
import { TourStep } from '../../../shared/components/ui/tour/tour.models';
import { TeamMemberToPost, TeamDocument, DocumentPermissionSummary, DocumentInviteDto, TeamInviteDto, Folder } from '../../../core/models';

@Component({
  selector: 'app-team-detail',
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
    ModalComponent,
    DocumentShareModalComponent,
    TeamShareModalComponent,
    TranslateModule
  ],
  templateUrl: `./team-detail.component.html`
})
export class TeamDetailComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private teamService = inject(TeamService);
  private docPermissionService = inject(DocumentPermissionService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private translateService = inject(TranslateService);
  private documentService = inject(DocumentService);

  private documentInviteService = inject(DocumentInviteService);
  private teamInviteService = inject(TeamInviteService);
  private tourService = inject(TourService);
  private folderService = inject(FolderService);

  shareDocId = signal<number | null>(null);
  shareRole = signal<number>(0); // 0=Viewer, 1=Editor
  shareExpirationDays = signal<number>(7);
  shareGeneratedUrl = signal<string | null>(null);
  shareLoading = signal(false);
  shareCopied = signal(false);
  documentInvites = signal<DocumentInviteDto[]>([]);
  
  shareTeamId = signal<number | null>(null);
  shareTeamOpen = signal(false);
  teamInvites = signal<TeamInviteDto[]>([]);

  selectedTeam = this.teamService.selectedTeam;

  roleNames: { [key: number]: string } = {
    0: 'ROLES.MEMBER',
    1: 'ROLES.TEAM_ADMIN',
    2: 'ROLES.OWNER'
  };

  docRoleNames: { [key: number]: string } = {
    0: 'ROLES.VIEWER',
    1: 'ROLES.EDITOR'
  };

  teamRoleKey(role: number): string {
    const keys: { [key: number]: string } = {
      0: 'ROLES.MEMBER', 1: 'ROLES.TEAM_ADMIN', 2: 'ROLES.OWNER'
    };
    return keys[role] ?? 'ROLES.MEMBER';
  }

  docRoleKey(role: number): string {
    return role === 1 ? 'ROLES.EDITOR' : 'ROLES.VIEWER';
  }

  memberOptionLabel(name: string, role: number): string {
    if (role === 1) return `${name} (${this.translateService.instant('ROLES.TEAM_ADMIN')})`;
    return name;
  }

  loading = signal(true);
  isDeleteModalOpen = signal(false);
  isDeleting = signal(false);
  isRemoveMemberModalOpen = signal(false);
  isRemovingMember = signal(false);
  memberToRemove = signal<TeamMemberToPost | null>(null);
  isRemoveDocPermissionModalOpen = signal(false);
  isRemovingDocPermission = signal(false);
  docPermissionToRemove = signal<{ docId: number; docTitle: string; permission: DocumentPermissionSummary } | null>(null);

  /** Track which document panels are expanded */
  expandedDocs = signal<Set<number>>(new Set());

  /** Accessible document ids for regular members */
  memberAccessibleDocIds = signal<Set<number> | null>(null);

  /** State for the add member to document form */
  addMemberDocId = signal<number | null>(null);
  addMemberSelectedId = signal<number | null>(null);
  addMemberSelectedRole = signal<number>(0);

  /** Track which folders are expanded in the Document Permissions section */
  expandedPermFolders = signal<Set<number | 'root'>>(new Set());

  /** Drag & drop state for Document Permissions */
  draggingDocId = signal<number | null>(null);
  dragOverTarget = signal<number | 'root' | null>(null);

  /** Team name editing (Owner only) */
  isEditingName = signal(false);
  editNameValue = '';
  isSavingName = signal(false);

  /** Folder management state */
  isCreateFolderModalOpen = signal(false);
  isRenameFolderModalOpen = signal(false);
  isDeleteFolderModalOpen = signal(false);
  newFolderName = '';
  renameFolderTarget = signal<Folder | null>(null);
  renameFolderName = '';
  deleteFolderTarget = signal<Folder | null>(null);
  isDeletingFolder = signal(false);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const teamId = Number(params['id']);
      this.shareTeamId.set(teamId);
      this.loadTeam(teamId);
    });
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

  loadTeam(teamId: number) {
    this.loading.set(true);
    this.selectedTeam.set(null);

    this.teamService.getTeamById(teamId).subscribe({
      next: (team) => {
        this.selectedTeam.set(team);
        this.refreshMemberAccessibleDocs(team.id);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private refreshMemberAccessibleDocs(teamId: number): void {
    if (this.isOwnerOrAdmin()) {
      this.memberAccessibleDocIds.set(null);
      return;
    }

    this.documentService.getDocuments({ teamId }).subscribe({
      next: (docs) => {
        this.memberAccessibleDocIds.set(new Set(docs.map(d => d.id)));
      },
      error: () => {
        this.memberAccessibleDocIds.set(new Set());
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/teams']);
  }

  openDocument(docId: number): void {
    this.router.navigate(['/editor', docId]);
  }

  // --- Delete Team ---

  openDeleteModal(): void {
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
  }

  confirmDeleteTeam(): void {
    const team = this.selectedTeam();
    if (!team) return;

    this.isDeleting.set(true);
    this.teamService.deleteTeam(team.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteModalOpen.set(false);
        this.router.navigate(['/teams']);
      },
      error: (err) => {
        console.error('Error deleting team:', err);
        this.isDeleting.set(false);
      }
    });
  }

  // --- Team Role Management ---

  isOwner(): boolean {
    return this.selectedTeam()?.currentUserRole === 2;
  }

  startEditName(): void {
    this.editNameValue = this.selectedTeam()?.name ?? '';
    this.isEditingName.set(true);
  }

  cancelEditName(): void {
    this.isEditingName.set(false);
  }

  saveTeamName(): void {
    const team = this.selectedTeam();
    const name = this.editNameValue.trim();
    if (!team || !name || name === team.name) {
      this.isEditingName.set(false);
      return;
    }
    this.isSavingName.set(true);
    this.teamService.updateTeamName(team.id, name).subscribe({
      next: () => {
        this.selectedTeam.set({ ...team, name });
        this.isEditingName.set(false);
        this.isSavingName.set(false);
        this.toastService.success(this.translateService.instant('TOASTS.TEAM_NAME_UPDATED'));
      },
      error: () => {
        this.isSavingName.set(false);
        this.toastService.error(this.translateService.instant('TOASTS.TEAM_NAME_UPDATE_FAILED'));
      }
    });
  }

  isOwnerOrAdmin(): boolean {
    const role = this.selectedTeam()?.currentUserRole;
    return role === 2 || role === 1;
  }

  isTeamAdmin(): boolean {
    return this.selectedTeam()?.currentUserRole === 1;
  }

  canManageDocPermissions(): boolean {
    return this.isOwnerOrAdmin();
  }

  isCurrentUserMember(): boolean {
    const userId = this.authService.currentUser()?.id;
    const team = this.selectedTeam();
    if (!userId || !team) return false;
    return team.members?.some(m => m.userId === userId) ?? false;
  }

  private getCurrentUserTeamMemberId(): number | null {
    const userId = this.authService.currentUser()?.id;
    const team = this.selectedTeam();
    if (!userId || !team) return null;
    const member = team.members?.find(m => m.userId === userId);
    return member?.id ?? null;
  }

  hasDocumentPermission(doc: TeamDocument): boolean {
    const myMemberId = this.getCurrentUserTeamMemberId();
    if (!myMemberId) return false;
    return doc.permissions?.some(p => p.teamMemberId === myMemberId) ?? false;
  }

  getDocPermissionsForView(doc: TeamDocument): DocumentPermissionSummary[] {
    return doc.permissions ?? [];
  }

  // verifica se o utilizador pode editar um documento numa equipa
  canEditDocument(doc: TeamDocument): boolean {
    const myRole = this.selectedTeam()?.currentUserRole;
    if (myRole === 2) {
      return true;
    }
    if (myRole === 1) {
      const myMemberId = this.getCurrentUserTeamMemberId();
      if (!myMemberId) return false;
      return doc.permissions?.some(p => p.teamMemberId === myMemberId) ?? false;
    }
    return false;
  }

  private getMemberRoleById(teamMemberId: number): number | null {
    const team = this.selectedTeam();
    if (!team) return null;
    const member = team.members?.find(m => m.id === teamMemberId);
    return member?.role ?? null;
  }

  isPermissionOwner(permission: DocumentPermissionSummary): boolean {
    return this.getMemberRoleById(permission.teamMemberId) === 2;
  }

  canChangeDocRole(permission: DocumentPermissionSummary): boolean {
    // Não se pode alterar a role de um TeamAdmin (são sempre Editor)
    if (permission.memberRole === 1) return false;
    if (this.isOwner()) return !this.isPermissionOwner(permission);
    if (this.isTeamAdmin()) {
      const memberRole = this.getMemberRoleById(permission.teamMemberId);
      return memberRole === 0; // TeamAdmin can only manage Member roles
    }
    return false;
  }

  canRemoveDocPermission(permission: DocumentPermissionSummary): boolean {
    if (this.isOwner()) return !this.isPermissionOwner(permission);
    if (this.isTeamAdmin()) {
      const memberRole = this.getMemberRoleById(permission.teamMemberId);
      return memberRole === 0; // TeamAdmin can only manage Member roles
    }
    return false;
  }

  onTeamRoleChange(member: TeamMemberToPost, newRole: number): void {
    this.teamService.updateMemberRole(member.id!, newRole).subscribe({
      next: () => {
        this.toastService.success(this.translateService.instant('TOASTS.ROLE_UPDATED'));
        // Recarregar equipa para atualizar documentos e permissões
        const team = this.selectedTeam();
        if (team) {
          this.loadTeam(team.id);
        }
      },
      error: (err) => {
        console.error('Error updating member role:', err);
        this.toastService.error(this.translateService.instant('TOASTS.ROLE_UPDATE_FAILED'));
      }
    });
  }

  canRemoveMember(member: TeamMemberToPost): boolean {
    const myRole = this.selectedTeam()?.currentUserRole;
    if (myRole === 2) {
      // Owner can remove anyone except themselves
      return member.role !== 2;
    }
    if (myRole === 1) {
      // TeamAdmin can remove only Members
      return member.role === 0;
    }
    return false;
  }

  removeMember(member: TeamMemberToPost): void {
    if (!member.id) return;
    this.memberToRemove.set(member);
    this.isRemoveMemberModalOpen.set(true);
  }

  closeRemoveMemberModal(): void {
    this.isRemoveMemberModalOpen.set(false);
    this.memberToRemove.set(null);
  }

  confirmRemoveMember(): void {
    const member = this.memberToRemove();
    if (!member?.id) return;
    this.isRemovingMember.set(true);
    this.teamService.removeMember(member.id).subscribe({
      next: () => {
        this.toastService.success(this.translateService.instant('TOASTS.MEMBER_REMOVED'));
        const team = this.selectedTeam();
        if (team) {
          const updated = {
            ...team,
            members: team.members.filter(m => m.id !== member.id),
            documents: team.documents.map(doc => ({
              ...doc,
              permissions: doc.permissions?.filter(p => p.teamMemberId !== member.id)
            }))
          };
          this.selectedTeam.set(updated);
        }
        this.isRemovingMember.set(false);
        this.closeRemoveMemberModal();
      },
      error: (err) => {
        console.error('Error removing member:', err);
        this.isRemovingMember.set(false);
        this.closeRemoveMemberModal();
        this.toastService.error(this.translateService.instant('TOASTS.MEMBER_REMOVE_FAILED'));
      }
    });
  }

  // --- Document Panel ---

  toggleDocPanel(docId: number): void {
    const current = new Set(this.expandedDocs());
    if (current.has(docId)) {
      current.delete(docId);
    } else {
      current.add(docId);
    }
    this.expandedDocs.set(current);
  }

  isDocExpanded(docId: number): boolean {
    return this.expandedDocs().has(docId);
  }

  // --- Document Permission Management ---

  onDocRoleChange(permission: DocumentPermissionSummary, newRole: number): void {
    this.docPermissionService.updatePermission(permission.id, newRole).subscribe({
      next: () => {
        this.toastService.success(this.translateService.instant('TOASTS.DOC_ROLE_UPDATED'));
        // Update local state
        const team = this.selectedTeam();
        if (team) {
          const updated = {
            ...team,
            documents: team.documents.map(doc => ({
              ...doc,
              permissions: doc.permissions?.map(p =>
                p.id === permission.id ? { ...p, documentRole: newRole } : p
              )
            }))
          };
          this.selectedTeam.set(updated);
        }
      },
      error: (err) => {
        console.error('Error updating document permission:', err);
        this.toastService.error(this.translateService.instant('TOASTS.DOC_ROLE_UPDATE_FAILED'));
      }
    });
  }

  removeDocPermission(docId: number, docTitle: string, permission: DocumentPermissionSummary): void {
    this.docPermissionToRemove.set({ docId, docTitle, permission });
    this.isRemoveDocPermissionModalOpen.set(true);
  }

  closeRemoveDocPermissionModal(): void {
    this.isRemoveDocPermissionModalOpen.set(false);
    this.docPermissionToRemove.set(null);
  }

  confirmRemoveDocPermission(): void {
    const target = this.docPermissionToRemove();
    if (!target) return;
    this.isRemovingDocPermission.set(true);
    this.docPermissionService.removePermission(target.permission.id).subscribe({
      next: () => {
        this.toastService.success(this.translateService.instant('TOASTS.USER_REMOVED_FROM_DOC'));
        const team = this.selectedTeam();
        if (team) {
          const updated = {
            ...team,
            documents: team.documents.map(doc => {
              if (doc.id === target.docId) {
                return {
                  ...doc,
                  permissions: doc.permissions?.filter(p => p.id !== target.permission.id)
                };
              }
              return doc;
            })
          };
          this.selectedTeam.set(updated);
        }
        this.isRemovingDocPermission.set(false);
        this.closeRemoveDocPermissionModal();
      },
      error: (err) => {
        console.error('Error removing document permission:', err);
        this.isRemovingDocPermission.set(false);
        this.closeRemoveDocPermissionModal();
        this.toastService.error(this.translateService.instant('TOASTS.USER_REMOVE_FROM_DOC_FAILED'));
      }
    });
  }

  visibleDocuments(): TeamDocument[] {
    const team = this.selectedTeam();
    if (!team) return [];
    if (this.isOwner()) return team.documents ?? [];
    // TeamAdmin e Member: apenas documentos com DocumentPermission
    if (this.isTeamAdmin()) {
      return team.documents?.filter(doc => this.hasDocumentPermission(doc)) ?? [];
    }
    const accessible = this.memberAccessibleDocIds();
    if (!accessible) return [];
    return team.documents?.filter(doc => accessible.has(doc.id)) ?? [];
  }

  /** Get members that can be added to a document (Members without existing permission) */
  getAddableMembers(doc: TeamDocument): TeamMemberToPost[] {
    const team = this.selectedTeam();
    if (!team) return [];

    const existingMemberIds = new Set(doc.permissions?.map(p => p.teamMemberId) ?? []);

    return team.members.filter(m =>
      m.role !== 2 && // exclude Owner
      m.id != null &&
      !existingMemberIds.has(m.id)
    );
  }

  openAddMemberForm(docId: number): void {
    this.addMemberDocId.set(docId);
    this.addMemberSelectedId.set(null);
    this.addMemberSelectedRole.set(0); // Default: Viewer
  }

  closeAddMemberForm(): void {
    this.addMemberDocId.set(null);
  }

  /** Check if the selected member in add-member form is a TeamAdmin */
  isSelectedMemberAdmin(): boolean {
    const memberId = this.addMemberSelectedId();
    if (!memberId) return false;
    const team = this.selectedTeam();
    const member = team?.members?.find(m => m.id === memberId);
    return member?.role === 1; // TeamAdmin
  }

  confirmAddMember(): void {
    const docId = this.addMemberDocId();
    const memberId = this.addMemberSelectedId();
    let role = this.addMemberSelectedRole();

    if (!docId || !memberId) return;

    // TeamAdmin é sempre Editor
    const team = this.selectedTeam();
    const member = team?.members?.find(m => m.id === memberId);
    if (member?.role === 1) {
      role = 1; // Editor
    }

    this.docPermissionService.addPermission({
      documentId: docId,
      teamMemberId: memberId,
      role: role
    }).subscribe({
      next: (newPermission) => {
        this.toastService.success(this.translateService.instant('TOASTS.USER_ADDED_TO_DOC'));
        // Find the member name for local state update
        if (team) {
          const permSummary: DocumentPermissionSummary = {
            id: newPermission.id,
            teamMemberId: memberId,
            memberName: member?.name ?? '',
            memberRole: member?.role ?? 0,
            documentRole: role
          };

          const updated = {
            ...team,
            documents: team.documents.map(doc => {
              if (doc.id === docId) {
                return {
                  ...doc,
                  permissions: [...(doc.permissions ?? []), permSummary]
                };
              }
              return doc;
            })
          };
          this.selectedTeam.set(updated);
        }
        this.closeAddMemberForm();
      },
      error: (err) => {
        console.error('Error adding document permission:', err);
        this.toastService.error(this.translateService.instant('TOASTS.USER_ADD_TO_DOC_FAILED'));
      }
    });
  }

  /**
   * Convidar utilizadores para um documento
   */
  openDocumentShareModal(docId: number): void {
    this.shareDocId.set(docId);
    this.shareRole.set(0);
    this.shareExpirationDays.set(7);
    this.shareGeneratedUrl.set(null);
    this.shareCopied.set(false);
    this.loadDocumentInvites(docId);
  }

  closeDocumentShareModal(): void {
    this.shareDocId.set(null);
    this.shareGeneratedUrl.set(null);
    this.documentInvites.set([]);
  }

  generateDocumentInviteLink(): void {
    const docId = this.shareDocId();
    if (!docId) return;

    this.shareLoading.set(true);
    this.documentInviteService.createInvite({
      documentId: docId,
      role: this.shareRole(),
      expirationDays: this.shareExpirationDays()
    }).subscribe({
      next: (invite) => {
        this.shareGeneratedUrl.set(invite.inviteUrl);
        this.shareLoading.set(false);
        this.shareCopied.set(false);
        // Reload list of invites
        this.loadDocumentInvites(docId);
      },
      error: (err) => {
        console.error('Error creating invite:', err);
        this.toastService.error(this.translateService.instant('TOASTS.INVITE_CREATE_FAILED'));
        this.shareLoading.set(false);
      }
    });
  }

  copyInviteLink(): void {
    const url = this.shareGeneratedUrl();
    if (!url) return;

    navigator.clipboard.writeText(url).then(() => {
      this.shareCopied.set(true);
      this.toastService.success(this.translateService.instant('TOASTS.LINK_COPIED'));
      setTimeout(() => this.shareCopied.set(false), 3000);
    });
  }

  loadDocumentInvites(docId: number): void {
    this.documentInviteService.getInvitesByDocument(docId).subscribe({
      next: (invites) => this.documentInvites.set(invites),
      error: () => this.documentInvites.set([])
    });
  }

  revokeDocumentInvite(inviteId: number): void {
    this.documentInviteService.revokeInvite(inviteId).subscribe({
      next: () => {
        this.toastService.success(this.translateService.instant('TOASTS.INVITE_REVOKED'));
        const docId = this.shareDocId();
        if (docId) this.loadDocumentInvites(docId);
      },
      error: () => {
        this.toastService.error(this.translateService.instant('TOASTS.INVITE_REVOKE_FAILED'));
      }
    });
  }

  clearDocumentInvitesList(): void {
    const usedInvites = this.documentInvites().filter(inv => inv.isUsed);
    if (usedInvites.length === 0) return;

    let completed = 0;
    let hadError = false;
    usedInvites.forEach(inv => {
      this.documentInviteService.revokeInvite(inv.id).subscribe({
        next: () => {
          completed += 1;
          if (completed === usedInvites.length) {
            const docId = this.shareDocId();
            if (docId) this.loadDocumentInvites(docId);
            if (!hadError) this.toastService.success(this.translateService.instant('TOASTS.INVITES_CLEARED'));
          }
        },
        error: () => {
          hadError = true;
          completed += 1;
          if (completed === usedInvites.length) {
            const docId = this.shareDocId();
            if (docId) this.loadDocumentInvites(docId);
            this.toastService.error(this.translateService.instant('TOASTS.INVITES_CLEAR_FAILED'));
          }
        }
      });
    });
  }

  viewInviteLink(url: string): void {
    this.shareGeneratedUrl.set(url);
    this.shareCopied.set(false);
  }

  // --- Folder Management ---

  openCreateFolderModal(): void {
    this.newFolderName = '';
    this.isCreateFolderModalOpen.set(true);
  }

  closeCreateFolderModal(): void {
    this.isCreateFolderModalOpen.set(false);
    this.newFolderName = '';
  }

  createFolder(): void {
    const team = this.selectedTeam();
    if (!team || !this.newFolderName.trim()) return;

    this.folderService.createFolder(this.newFolderName.trim(), team.id).subscribe({
      next: () => {
        this.closeCreateFolderModal();
        this.toastService.success(this.translateService.instant('TOASTS.FOLDER_CREATED'));
        this.loadTeam(team.id);
      },
      error: (err) => {
        console.error('Error creating folder:', err);
        this.toastService.error(this.translateService.instant('TOASTS.FOLDER_CREATE_FAILED'));
      }
    });
  }

  openRenameFolderModal(folder: Folder): void {
    this.renameFolderTarget.set(folder);
    this.renameFolderName = folder.name;
    this.isRenameFolderModalOpen.set(true);
  }

  closeRenameFolderModal(): void {
    this.isRenameFolderModalOpen.set(false);
    this.renameFolderTarget.set(null);
    this.renameFolderName = '';
  }

  confirmRenameFolder(): void {
    const folder = this.renameFolderTarget();
    if (!folder || !this.renameFolderName.trim()) return;

    this.folderService.updateFolder(folder.id, this.renameFolderName.trim()).subscribe({
      next: () => {
        this.closeRenameFolderModal();
        this.toastService.success(this.translateService.instant('TOASTS.FOLDER_RENAME_SUCCESS'));
        const team = this.selectedTeam();
        if (team) this.loadTeam(team.id);
      },
      error: (err) => {
        console.error('Error renaming folder:', err);
        this.toastService.error(this.translateService.instant('TOASTS.FOLDER_RENAME_FAILED'));
      }
    });
  }

  openDeleteFolderModal(folder: Folder): void {
    this.deleteFolderTarget.set(folder);
    this.isDeleteFolderModalOpen.set(true);
  }

  closeDeleteFolderModal(): void {
    this.isDeleteFolderModalOpen.set(false);
    this.deleteFolderTarget.set(null);
  }

  confirmDeleteFolder(): void {
    const folder = this.deleteFolderTarget();
    if (!folder) return;

    this.isDeletingFolder.set(true);
    this.folderService.deleteFolder(folder.id).subscribe({
      next: () => {
        this.isDeletingFolder.set(false);
        this.closeDeleteFolderModal();
        this.toastService.success(this.translateService.instant('TOASTS.FOLDER_DELETE_SUCCESS'));
        const team = this.selectedTeam();
        if (team) this.loadTeam(team.id);
      },
      error: (err) => {
        this.isDeletingFolder.set(false);
        console.error('Error deleting folder:', err);
        this.toastService.error(this.translateService.instant('TOASTS.FOLDER_DELETE_FAILED'));
      }
    });
  }

  moveDocToFolder(doc: TeamDocument, folderId: number | null): void {
    const team = this.selectedTeam();
    if (!team) return;

    if (folderId === null) {
      // Remove from current folder
      const currentFolderId = doc.folderId;
      if (!currentFolderId) return;
      this.folderService.removeDocumentFromFolder(currentFolderId, doc.id).subscribe({
        next: () => {
          this.toastService.success(this.translateService.instant('TOASTS.DOC_REMOVED_FROM_FOLDER'));
          this.loadTeam(team.id);
        },
        error: (err) => {
          console.error('Error removing document from folder:', err);
          this.toastService.error(this.translateService.instant('TOASTS.DOC_MOVE_FAILED'));
        }
      });
    } else {
      this.folderService.moveDocumentToFolder(folderId, doc.id).subscribe({
        next: () => {
          this.toastService.success(this.translateService.instant('TOASTS.DOC_MOVED_TO_FOLDER'));
          this.loadTeam(team.id);
        },
        error: (err) => {
          console.error('Error moving document to folder:', err);
          this.toastService.error(this.translateService.instant('TOASTS.DOC_MOVE_FAILED'));
        }
      });
    }
  }

  // --- Document Permissions folder grouping ---

  togglePermFolder(folderId: number | 'root'): void {
    const current = new Set(this.expandedPermFolders());
    if (current.has(folderId)) {
      current.delete(folderId);
    } else {
      current.add(folderId);
    }
    this.expandedPermFolders.set(current);
  }

  isPermFolderExpanded(folderId: number | 'root'): boolean {
    return this.expandedPermFolders().has(folderId);
  }

  getVisibleDocsInFolder(folderId: number): TeamDocument[] {
    return this.visibleDocuments().filter(d => d.folderId === folderId);
  }

  getVisibleUnfolderedDocs(): TeamDocument[] {
    return this.visibleDocuments().filter(d => !d.folderId);
  }

  /** Returns folders that have at least one visible document */
  getVisibleFolders(): Folder[] {
    const team = this.selectedTeam();
    if (!team?.folders) return [];
    const visibleDocFolderIds = new Set(
      this.visibleDocuments().filter(d => d.folderId).map(d => d.folderId)
    );
    return team.folders.filter(f => visibleDocFolderIds.has(f.id));
  }

  /** Returns folders for the sidebar: Owners/Admins see all, Members see only folders with accessible docs */
  getSidebarFolders(): Folder[] {
    const team = this.selectedTeam();
    if (!team?.folders) return [];
    if (this.isOwnerOrAdmin()) return team.folders;
    return this.getVisibleFolders();
  }

  hasAnyFolderStructure(): boolean {
    return this.getVisibleFolders().length > 0;
  }

  // --- Drag & Drop for Document Permissions ---

  onDragStart(event: DragEvent, docId: number): void {
    this.draggingDocId.set(docId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(docId));
    }
  }

  onDragEnd(): void {
    this.draggingDocId.set(null);
    this.dragOverTarget.set(null);
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
    if (!docId || !this.isOwnerOrAdmin()) return;

    const team = this.selectedTeam();
    if (!team) return;

    this.folderService.moveDocumentToFolder(folderId, docId).subscribe({
      next: () => {
        this.toastService.success(this.translateService.instant('TOASTS.DOC_MOVED_TO_FOLDER'));
        this.loadTeam(team.id);
      },
      error: (err) => {
        console.error('Error moving document to folder:', err);
        this.toastService.error(this.translateService.instant('TOASTS.DOC_MOVE_FAILED'));
      }
    });
  }

  onDropOnRoot(event: DragEvent): void {
    event.preventDefault();
    this.dragOverTarget.set(null);
    const docId = this.draggingDocId();
    this.draggingDocId.set(null);
    if (!docId || !this.isOwnerOrAdmin()) return;

    const team = this.selectedTeam();
    if (!team) return;

    const doc = team.documents?.find(d => d.id === docId);
    if (!doc?.folderId) return;

    this.folderService.removeDocumentFromFolder(doc.folderId, docId).subscribe({
      next: () => {
        this.toastService.success(this.translateService.instant('TOASTS.DOC_REMOVED_FROM_FOLDER'));
        this.loadTeam(team.id);
      },
      error: (err) => {
        console.error('Error removing document from folder:', err);
        this.toastService.error(this.translateService.instant('TOASTS.DOC_MOVE_FAILED'));
      }
    });
  }

  /**
   * Convidar utilizadores para a equipa
   */
  openTeamShareModal(): void {
    const teamId = this.shareTeamId();
    //console.log(teamId);
    if (!teamId) return;
    this.shareTeamOpen.set(true);
    this.shareExpirationDays.set(7);
    this.shareGeneratedUrl.set(null);
    this.shareCopied.set(false);
    this.loadTeamInvites(teamId);
  }

  closeTeamShareModal(): void {
    this.shareGeneratedUrl.set(null);
    this.shareTeamOpen.set(false);
    this.teamInvites.set([]);
  }

  generateTeamInviteLink(): void {
    const teamId = this.shareTeamId();
    if (!teamId) return;

    this.shareLoading.set(true);
    this.teamInviteService.createInvite({
      teamId: teamId,
      expirationDays: this.shareExpirationDays()
    }).subscribe({
      next: (invite) => {
        this.shareGeneratedUrl.set(invite.inviteUrl);
        this.shareLoading.set(false);
        this.shareCopied.set(false);
        // Reload list of invites
        this.loadTeamInvites(teamId);
      },
      error: (err) => {
        console.error('Error creating invite:', err);
        this.toastService.error(this.translateService.instant('TOASTS.INVITE_CREATE_FAILED'));
        this.shareLoading.set(false);
      }
    });
  }


  loadTeamInvites(teamId: number): void {
    this.teamInviteService.getInvitesByTeam(teamId).subscribe({
      next: (invites) => this.teamInvites.set(invites),
      error: () => this.teamInvites.set([])
    });
  }

  revokeTeamInvite(inviteId: number): void {
    this.teamInviteService.revokeInvite(inviteId).subscribe({
      next: () => {
        this.toastService.success(this.translateService.instant('TOASTS.INVITE_REVOKED'));
        const teamId = this.shareTeamId();
        if (teamId) this.loadTeamInvites(teamId);
      },
      error: () => {
        this.toastService.error(this.translateService.instant('TOASTS.INVITE_REVOKE_FAILED'));
      }
    });
  }

  clearTeamInvitesList(): void {
    const usedInvites = this.teamInvites().filter(inv => inv.isUsed);
    if (usedInvites.length === 0) return;

    let completed = 0;
    let hadError = false;
    usedInvites.forEach(inv => {
      this.teamInviteService.revokeInvite(inv.id).subscribe({
        next: () => {
          completed += 1;
          if (completed === usedInvites.length) {
            const teamId = this.shareTeamId();
            if (teamId) this.loadTeamInvites(teamId);
            if (!hadError) this.toastService.success(this.translateService.instant('TOASTS.INVITES_CLEARED'));
          }
        },
        error: () => {
          hadError = true;
          completed += 1;
          if (completed === usedInvites.length) {
            const teamId = this.shareTeamId();
            if (teamId) this.loadTeamInvites(teamId);
            this.toastService.error(this.translateService.instant('TOASTS.INVITES_CLEAR_FAILED'));
          }
        }
      });
    });
  }

  startTour(): void {
    const t = (key: string) => this.translateService.instant(key);
    const steps: TourStep[] = [
      {
        targetSelector: '[data-tour="team-members-section"]',
        title: t('TOUR.TEAM.MEMBERS_TITLE'),
        description: t('TOUR.TEAM.MEMBERS_DESC'),
        position: 'right',
      },
      {
        targetSelector: '[data-tour="member-role"]',
        title: t('TOUR.TEAM.ROLES_TITLE'),
        description: t('TOUR.TEAM.ROLES_DESC'),
        position: 'left',
      },
      {
        targetSelector: '[data-tour="doc-permissions-section"]',
        title: t('TOUR.TEAM.DOC_PERMS_TITLE'),
        description: t('TOUR.TEAM.DOC_PERMS_DESC'),
        position: 'right',
      },
    ];

    // Passo do botão Share - apenas para Owner ou Team Admin
    if (this.isOwnerOrAdmin() && this.visibleDocuments().length > 0) {
      const firstDoc = this.visibleDocuments()[0];
      steps.push(
        {
          targetSelector: '[data-tour="share-btn"]',
          title: t('TOUR.TEAM.SHARE_BTN_TITLE'),
          description: t('TOUR.TEAM.SHARE_BTN_DESC'),
          position: 'bottom',
        },
        { 
          title: t('TOUR.TEAM.SHARE_DOC_TITLE'),
          screenPosition: 'top',
          description: t('TOUR.TEAM.SHARE_DOC_DESC'),
          position: 'bottom',
          onActivate: () => {
            if (firstDoc) {
              this.openDocumentShareModal(firstDoc.id);
            }
          },
          onDeactivate: () => {
            this.closeDocumentShareModal();
          },
        },
      );
    }

    // Passo da Danger Zone - apenas para Owner
    if (this.isOwner()) {
      steps.push({
        targetSelector: '[data-tour="danger-zone"]',
        title: t('TOUR.TEAM.DANGER_TITLE'),
        description: t('TOUR.TEAM.DANGER_DESC'),
        position: 'left',
      });
    }

    this.tourService.start(steps);
  }
}
