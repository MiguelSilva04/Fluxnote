import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent, ModalComponent } from '../../../shared/components/ui';
import { TeamService, DocumentPermissionService, AuthService, DocumentInviteService } from '../../../core/services';
import { ToastService } from '../../../shared/services/toast.service';
import { TeamMemberToPost, TeamDocument, DocumentPermissionSummary, DocumentInviteDto } from '../../../core/models';

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
    ModalComponent
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

  private inviteService = inject(DocumentInviteService);

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

  /** State for the add member to document form */
  addMemberDocId = signal<number | null>(null);
  addMemberSelectedId = signal<number | null>(null);
  addMemberSelectedRole = signal<number>(0);

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
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
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
    const permissions = doc.permissions ?? [];
    if (permissions.length > 0) return permissions;
    if (this.isOwnerOrAdmin()) return permissions;
    const team = this.selectedTeam();
    if (!team) return [];
    return team.members
      .filter(m => m.id != null)
      .map(m => ({
        id: -m.id!,
        teamMemberId: m.id!,
        memberName: m.name,
        documentRole: 0
      }));
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
        // Update local state
        const team = this.selectedTeam();
        if (team) {
          const updated = {
            ...team,
            members: team.members.map(m =>
              m.id === member.id ? { ...m, role: newRole } : m
            )
          };
          this.selectedTeam.set(updated);
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

  /** Get members that can be added to a document (Members without existing permission) */
  getAddableMembers(doc: TeamDocument): TeamMemberToPost[] {
    const team = this.selectedTeam();
    if (!team) return [];

    const existingMemberIds = new Set(doc.permissions?.map(p => p.teamMemberId) ?? []);

    return team.members.filter(m =>
      m.role !== 2 && // Allow Member + Team Admin; exclude Owner
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

  confirmAddMember(): void {
    const docId = this.addMemberDocId();
    const memberId = this.addMemberSelectedId();
    const role = this.addMemberSelectedRole();

    if (!docId || !memberId) return;

    this.docPermissionService.addPermission({
      documentId: docId,
      teamMemberId: memberId,
      role: role
    }).subscribe({
      next: (newPermission) => {
        this.toastService.success('User added to document.');
        // Find the member name for local state update
        const team = this.selectedTeam();
        if (team) {
          const member = team.members.find(m => m.id === memberId);
          const permSummary: DocumentPermissionSummary = {
            id: newPermission.id,
            teamMemberId: memberId,
            memberName: member?.name ?? '',
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

  visibleDocuments(): TeamDocument[] {
    const team = this.selectedTeam();
    if (!team) return [];
    if (this.isOwner()) return team.documents ?? [];
    return team.documents?.filter(doc => {
      const permissions = doc.permissions ?? [];
      if (permissions.length === 0) return true;
      return this.hasDocumentPermission(doc);
    }) ?? [];
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
        // Recarregar lista de convites
        this.loadDocumentInvites(docId);
      },
      error: (err) => {
        console.error('Error creating invite:', err);
        this.toastService.error('Erro ao criar convite.');
        this.shareLoading.set(false);
      }
    });
  }

  copyInviteLink(): void {
    const url = this.shareGeneratedUrl();
    if (!url) return;

    navigator.clipboard.writeText(url).then(() => {
      this.shareCopied.set(true);
      this.toastService.success('Link copiado!');
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
        this.toastService.success('Convite revogado.');
        const docId = this.shareDocId();
        if (docId) this.loadDocumentInvites(docId);
      },
      error: () => {
        this.toastService.error('Erro ao revogar convite.');
      }
    });
  }
}
