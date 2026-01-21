import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent } from '../../../shared/components/ui';
import { DocumentService, TeamService } from '../../../core/services';

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
    BadgeComponent
  ],
  template: `
    <app-dashboard-layout>
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">My Documents</h1>
          <p class="text-gray-600">Manage and organize your documents</p>
        </div>
        <app-button (onClick)="openTeamSelectModal()" [leftIcon]="true" customClass="bg-[#155347] hover:bg-[#0d3d31]">
          <lucide-icon leftIcon name="plus" class="h-4 w-4"></lucide-icon>
          New Document
        </app-button>
      </div>

      <!-- Tabs -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex gap-1 border-b border-gray-200">
          @for (tab of tabs; track tab.id) {
            <button
              (click)="activeTab.set(tab.id)"
              [class]="'px-4 py-2 text-sm font-medium border-b-2 transition-colors ' + (activeTab() === tab.id ? 'border-[#155347] text-[#155347]' : 'border-transparent text-gray-600 hover:text-gray-900')"
            >
              {{ tab.label }}
            </button>
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

      <!-- Documents Grid -->
      <div [class]="viewMode() === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'">
        @for (doc of documents(); track doc.id) {
          <app-card customClass="hover:shadow-lg transition-shadow cursor-pointer" (click)="handleDocumentClick(doc.id)">
            <app-card-content customClass="p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="p-3 bg-[#e8f0ee] rounded-lg">
                  <lucide-icon name="file-text" class="h-6 w-6 text-[#155347]"></lucide-icon>
                </div>
                <button class="p-1 hover:bg-gray-100 rounded" (click)="$event.stopPropagation()">
                  <lucide-icon name="ellipsis-vertical" class="h-5 w-5 text-gray-400"></lucide-icon>
                </button>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2">{{ doc.title }}</h3>
              <div class="flex items-center gap-4 text-sm text-gray-600">
                <div class="flex items-center gap-1">
                  <lucide-icon name="clock" class="h-4 w-4"></lucide-icon>
                  <span>{{ doc.lastEdited }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <lucide-icon name="users" class="h-4 w-4"></lucide-icon>
                  <span>{{ doc.sharedWith }}</span>
                </div>
              </div>
            </app-card-content>
          </app-card>
        }
      </div>

      <!-- Team Selection Modal -->
      @if (isTeamSelectModalOpen()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-900">Novo Documento</h2>
              <button (click)="closeTeamSelectModal()" class="text-gray-400 hover:text-gray-600">×</button>
            </div>

            <div class="p-6 space-y-4">
              <p class="text-sm text-gray-600">
                Escolha uma equipa onde seja o proprietário para o seu novo documento ou crie uma nova.
              </p>

              <div class="relative">
                <lucide-icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"></lucide-icon>
                <input
                  type="text"
                  placeholder="Nome da equipa..."
                  [(ngModel)]="searchTeam"
                  class="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#155347] focus:border-transparent text-sm"
                />
              </div>

              <div>
                <h3 class="text-sm font-medium text-gray-700 mb-3">As suas Equipas (Proprietário)</h3>
                <div class="space-y-2 max-h-64 overflow-y-auto">
                  @for (team of filteredTeams(); track team.id) {
                    <button
                      (click)="selectedTeam.set(team.id)"
                      [class]="'w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ' + (selectedTeam() === team.id ? 'border-[#155347] bg-[#e8f0ee]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50')"
                    >
                      <span class="font-medium text-gray-900">{{ team.name }}</span>
                      <app-badge [customClass]="team.badge + ' text-white'">{{ team.role }}</app-badge>
                    </button>
                  }
                </div>
              </div>

              <button class="flex items-center gap-2 text-sm font-medium text-[#155347] hover:underline">
                <lucide-icon name="plus" class="h-4 w-4"></lucide-icon>
                Criar nova equipa
              </button>
            </div>

            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <app-button variant="ghost" (onClick)="closeTeamSelectModal()">Cancelar</app-button>
              <app-button
                (onClick)="handleTeamSelect()"
                [disabled]="!selectedTeam()"
                customClass="bg-[#155347] hover:bg-[#0d3d31] disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Continuar
              </app-button>
            </div>
          </div>
        </div>
      }
    </app-dashboard-layout>
  `
})
export class DashboardComponent {
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private teamService = inject(TeamService);

  viewMode = signal<'grid' | 'list'>('grid');
  activeTab = signal('all');
  isTeamSelectModalOpen = signal(false);
  selectedTeam = signal<number | null>(null);
  searchTeamQuery = signal('');

  documents = this.documentService.documents;
  myTeams = this.teamService.myTeams;

  tabs = [
    { id: 'all', label: 'All Documents' },
    { id: 'recent', label: 'Recent' },
    { id: 'shared', label: 'Shared with me' }
  ];

  filteredTeams = computed(() => {
    const query = this.searchTeamQuery().toLowerCase();
    return this.myTeams().filter(team =>
      team.name.toLowerCase().includes(query)
    );
  });

  get searchTeam(): string {
    return this.searchTeamQuery();
  }

  set searchTeam(value: string) {
    this.searchTeamQuery.set(value);
  }

  openTeamSelectModal(): void {
    this.isTeamSelectModalOpen.set(true);
  }

  closeTeamSelectModal(): void {
    this.isTeamSelectModalOpen.set(false);
    this.selectedTeam.set(null);
  }

  handleTeamSelect(): void {
    if (this.selectedTeam()) {
      this.closeTeamSelectModal();
      this.router.navigate(['/editor']);
    }
  }

  handleDocumentClick(docId: number): void {
    this.router.navigate(['/editor']);
  }
}
