import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, ModalComponent } from '../../../shared/components/ui';
import { DocumentService } from '../../../core/services';
import { DocumentDto } from '../../../core/models';

@Component({
  selector: 'app-trash',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    ModalComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Trash</h1>
          <p class="text-gray-600">Documents you've deleted. Restore them or delete permanently.</p>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <lucide-icon name="loader-circle" class="h-8 w-8 text-[#155347] animate-spin"></lucide-icon>
          <span class="ml-3 text-gray-600">Loading trash...</span>
        </div>
      }

      <!-- Empty State -->
      @if (!isLoading() && trashDocuments().length === 0) {
        <div class="text-center py-12">
          <div class="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <lucide-icon name="trash-2" class="h-8 w-8 text-gray-400"></lucide-icon>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Trash is empty</h3>
          <p class="text-gray-600">Documents you delete will appear here</p>
        </div>
      }

      <!-- Trash Documents Grid -->
      @if (!isLoading() && trashDocuments().length > 0) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (doc of trashDocuments(); track doc.id) {
            <app-card customClass="hover:shadow-lg transition-shadow">
              <app-card-content customClass="p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="p-3 bg-red-50 rounded-lg">
                    <lucide-icon name="file-text" class="h-6 w-6 text-red-400"></lucide-icon>
                  </div>
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">{{ doc.title }}</h3>
                <div class="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div class="flex items-center gap-1">
                    <lucide-icon name="clock" class="h-4 w-4"></lucide-icon>
                    <span>Deleted {{ formatDate(doc.updatedAt) }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <lucide-icon name="users" class="h-4 w-4"></lucide-icon>
                    <span>{{ doc.teamName }}</span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <app-button 
                    variant="outline" 
                    size="sm" 
                    customClass="flex-1"
                    (onClick)="handleRestore(doc.id)"
                  >
                    <lucide-icon name="undo-2" class="h-4 w-4 mr-1"></lucide-icon>
                    Restore
                  </app-button>
                  <app-button 
                    variant="outline" 
                    size="sm" 
                    customClass="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    (onClick)="openDeleteModal(doc.id)"
                  >
                    <lucide-icon name="trash-2" class="h-4 w-4 mr-1"></lucide-icon>
                    Delete
                  </app-button>
                </div>
              </app-card-content>
            </app-card>
          }
        </div>
      }

      <!-- Permanent Delete Confirmation Modal -->
      <app-modal
        [isOpen]="isDeleteModalOpen()"
        title="Permanently Delete"
        (onClose)="closeDeleteModal()"
        [hasFooter]="true"
        maxWidth="sm"
      >
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <lucide-icon name="triangle-alert" class="h-6 w-6 text-red-600"></lucide-icon>
          </div>
          <p class="text-gray-600 mb-2">
            Are you sure you want to permanently delete this document?
          </p>
          <p class="text-sm text-red-600 font-medium">
            This action cannot be undone.
          </p>
        </div>
        <div footer class="flex gap-3 w-full">
          <app-button variant="ghost" customClass="flex-1" (onClick)="closeDeleteModal()">Cancel</app-button>
          <app-button 
            customClass="flex-1 bg-red-600 hover:bg-red-700" 
            (onClick)="confirmPermanentDelete()"
            [isLoading]="isDeleting()"
          >
            Delete Forever
          </app-button>
        </div>
      </app-modal>
    </app-dashboard-layout>
  `
})
export class TrashComponent implements OnInit {
  private router = inject(Router);
  private documentService = inject(DocumentService);

  // State
  trashDocuments = signal<DocumentDto[]>([]);
  isLoading = signal(false);
  isDeleteModalOpen = signal(false);
  documentToDelete = signal<number | null>(null);
  isDeleting = signal(false);

  ngOnInit(): void {
    this.loadTrash();
  }

  loadTrash(): void {
    this.isLoading.set(true);
    this.documentService.getTrash().subscribe({
      next: (docs) => {
        this.trashDocuments.set(docs);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading trash:', err);
        this.isLoading.set(false);
      }
    });
  }

  handleRestore(docId: number): void {
    this.documentService.restoreDocument(docId).subscribe({
      next: () => {
        // Remover da lista local
        this.trashDocuments.update(docs => docs.filter(d => d.id !== docId));
      },
      error: (err) => {
        console.error('Error restoring document:', err);
      }
    });
  }

  openDeleteModal(docId: number): void {
    this.documentToDelete.set(docId);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.documentToDelete.set(null);
  }

  confirmPermanentDelete(): void {
    const docId = this.documentToDelete();
    if (!docId) return;

    this.isDeleting.set(true);
    this.documentService.permanentDeleteDocument(docId).subscribe({
      next: () => {
        this.trashDocuments.update(docs => docs.filter(d => d.id !== docId));
        this.isDeleting.set(false);
        this.closeDeleteModal();
      },
      error: (err) => {
        console.error('Error permanently deleting document:', err);
        this.isDeleting.set(false);
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }
}
