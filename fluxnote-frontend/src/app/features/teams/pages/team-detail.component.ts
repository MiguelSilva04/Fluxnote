import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent, ModalComponent } from '../../../shared/components/ui';
import { DocumentShareModalComponent } from '../../../shared/components/document-share-modal/document-share-modal.component';
import { TeamService, DocumentPermissionService, AuthService, DocumentInviteService, DocumentService, FolderService } from '../../../core/services';
import { ToastService } from '../../../shared/services/toast.service';
import { TourService } from '../../../shared/services/tour.service';
import { TourStep } from '../../../shared/components/ui/tour/tour.models';
import { TeamMemberToPost, TeamDocument, DocumentPermissionSummary, DocumentInviteDto, Folder } from '../../../core/models';

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
    DocumentShareModalComponent
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
  private documentService = inject(DocumentService);

  private inviteService = inject(DocumentInviteService);
  private tourService = inject(TourService);
  private folderService = inject(FolderService);

  shareDocId = signal<number | null>(null);
  shareRole = signal<number>(0); // 0=Viewer, 1=Editor
  shareExpirationDays = signal<number>(7);
  shareGeneratedUrl = signal<string | null>(null);
  shareLoading = signal(false);
  shareCopied = signal(false);
  documentInvites = signal<DocumentInviteDto[]>([]);

  selectedTeam = this.teamService.selectedTeam;

  roleNames: { [key: number]: string } = {
    0: 'Member',
    1: 'Team Admin',
    2: 'Owner'
  };

  docRoleNames: { [key: number]: string } = {
    0: 'Viewer',
    1: 'Editor'
  };

  loading = signal(true);
  isDeleteModalOpen = signal(false);
  isDeleting = signal(false);
  isRemoveMemberModalOpen = signal(false);
  isRemovingMember = signal(false);
  memberToRemove = signal<TeamMemberToPost | null>(null);
  isRemoveDocPermissionModalOpen = signal(false);
  isRemovingDocPermission = signal(false);
  docPermissionToRemove = signal<{ docId: number; permission: DocumentPermissionSummary } | null>(null);

  /** Track which document panels are expanded */
  expandedDocs = signal<Set<number>>(new Set());

  /** Accessible document ids for regular members */
  memberAccessibleDocIds = signal<Set<number> | null>(null);

  /** State for the add member to document form */
  addMemberDocId = signal<number | null>(null);
  addMemberSelectedId = signal<number | null>(null);
  addMemberSelectedRole = signal<number>(0);

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
        this.toastService.success('Role updated successfully.');
        // Recarregar equipa para atualizar documentos e permissões
        const team = this.selectedTeam();
        if (team) {
          this.loadTeam(team.id);
        }
      },
      error: (err) => {
        console.error('Error updating member role:', err);
        this.toastService.error('Failed to update role. Please try again.');
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
        this.toastService.success('Member removed from team.');
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
        this.toastService.error('Failed to remove member. Please try again.');
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
        this.toastService.success('Document role updated successfully.');
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
        this.toastService.error('Failed to update document role. Please try again.');
      }
    });
  }

  removeDocPermission(docId: number, permission: DocumentPermissionSummary): void {
    this.docPermissionToRemove.set({ docId, permission });
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
        this.toastService.success('User removed from document.');
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
        this.toastService.error('Failed to remove user from document. Please try again.');
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
        this.toastService.success('User added to document.');
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
        this.toastService.error('Failed to add user to document. Please try again.');
      }
    });
  }

  /**
   * Convidar utilizadores para um documento
   */
  openShareModal(docId: number): void {
    this.shareDocId.set(docId);
    this.shareRole.set(0);
    this.shareExpirationDays.set(7);
    this.shareGeneratedUrl.set(null);
    this.shareCopied.set(false);
    this.loadDocumentInvites(docId);
  }

  closeShareModal(): void {
    this.shareDocId.set(null);
    this.shareGeneratedUrl.set(null);
    this.documentInvites.set([]);
  }

  generateInviteLink(): void {
    const docId = this.shareDocId();
    if (!docId) return;

    this.shareLoading.set(true);
    this.inviteService.createInvite({
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
        this.toastService.error('Error creating invite.');
        this.shareLoading.set(false);
      }
    });
  }

  copyInviteLink(): void {
    const url = this.shareGeneratedUrl();
    if (!url) return;

    navigator.clipboard.writeText(url).then(() => {
      this.shareCopied.set(true);
      this.toastService.success('Link copied!');
      setTimeout(() => this.shareCopied.set(false), 3000);
    });
  }

  loadDocumentInvites(docId: number): void {
    this.inviteService.getInvitesByDocument(docId).subscribe({
      next: (invites) => this.documentInvites.set(invites),
      error: () => this.documentInvites.set([])
    });
  }

  revokeInvite(inviteId: number): void {
    this.inviteService.revokeInvite(inviteId).subscribe({
      next: () => {
        this.toastService.success('Invite revoked.');
        const docId = this.shareDocId();
        if (docId) this.loadDocumentInvites(docId);
      },
      error: () => {
        this.toastService.error('Error revoking invite.');
      }
    });
  }

  clearInvitesList(): void {
    const usedInvites = this.documentInvites().filter(inv => inv.isUsed);
    if (usedInvites.length === 0) return;

    let completed = 0;
    let hadError = false;
    usedInvites.forEach(inv => {
      this.inviteService.revokeInvite(inv.id).subscribe({
        next: () => {
          completed += 1;
          if (completed === usedInvites.length) {
            const docId = this.shareDocId();
            if (docId) this.loadDocumentInvites(docId);
            if (!hadError) this.toastService.success('Used invites cleared.');
          }
        },
        error: () => {
          hadError = true;
          completed += 1;
          if (completed === usedInvites.length) {
            const docId = this.shareDocId();
            if (docId) this.loadDocumentInvites(docId);
            this.toastService.error('Failed to clear some invites.');
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
        this.toastService.success('Folder created.');
        this.loadTeam(team.id);
      },
      error: (err) => {
        console.error('Error creating folder:', err);
        this.toastService.error('Failed to create folder.');
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
        this.toastService.success('Folder renamed.');
        const team = this.selectedTeam();
        if (team) this.loadTeam(team.id);
      },
      error: (err) => {
        console.error('Error renaming folder:', err);
        this.toastService.error('Failed to rename folder.');
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
        this.toastService.success('Folder deleted. Documents moved out.');
        const team = this.selectedTeam();
        if (team) this.loadTeam(team.id);
      },
      error: (err) => {
        this.isDeletingFolder.set(false);
        console.error('Error deleting folder:', err);
        this.toastService.error('Failed to delete folder.');
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
          this.toastService.success('Document removed from folder.');
          this.loadTeam(team.id);
        },
        error: (err) => {
          console.error('Error removing document from folder:', err);
          this.toastService.error('Failed to move document.');
        }
      });
    } else {
      this.folderService.moveDocumentToFolder(folderId, doc.id).subscribe({
        next: () => {
          this.toastService.success('Document moved to folder.');
          this.loadTeam(team.id);
        },
        error: (err) => {
          console.error('Error moving document to folder:', err);
          this.toastService.error('Failed to move document.');
        }
      });
    }
  }

  startTour(): void {
    const steps: TourStep[] = [
      {
        targetSelector: '[data-tour="team-members-section"]',
        title: 'Team Members',
        description:
          'Here you can see all the members of this team, their roles and manage their access.',
        position: 'right',
      },
      {
        targetSelector: '[data-tour="member-role"]',
        title: 'Team Roles',
        description:
          'Each member has a role: Owner has full permissions over the team; Team Admin can add/remove members, is an Editor on all documents they belong to, and can share documents and change other members\' roles; Member has basic access to assigned documents only.',
        position: 'left',
      },
      {
        targetSelector: '[data-tour="doc-permissions-section"]',
        title: 'Document Permissions',
        description:
          'This section shows per-document permissions. Expand any document to see which members have access and their role (Viewer or Editor).',
        position: 'right',
      },
    ];

    // Passo do botão Share - apenas para Owner ou Team Admin
    if (this.isOwnerOrAdmin() && this.visibleDocuments().length > 0) {
      const firstDoc = this.visibleDocuments()[0];
      steps.push(
        {
          targetSelector: '[data-tour="share-btn"]',
          title: 'Share Button',
          description:
            'Clicking this button allows you to generate shareable links for this document, where you can set the role and expiration date.',
          position: 'bottom',
        },
        { 
          title: 'Share Documents',
          screenPosition: 'top',
          description:
            'Choose a role (Viewer/Editor) and an expiration date, then share the generated link with the person you want to invite.',
          position: 'bottom',
          onActivate: () => {
            if (firstDoc) {
              this.openShareModal(firstDoc.id);
            }
          },
          onDeactivate: () => {
            this.closeShareModal();
          },
        },
      );
    }

    // Passo da Danger Zone - apenas para Owner
    if (this.isOwner()) {
      steps.push({
        targetSelector: '[data-tour="danger-zone"]',
        title: 'Delete Team',
        description:
          'As the Owner, you can permanently delete this team. This will remove all documents and members - this action cannot be undone.',
        position: 'left',
      });
    }

    this.tourService.start(steps);
  }
}
