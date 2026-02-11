import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, BadgeComponent, ModalComponent, InputComponent } from '../../../shared/components/ui';
import { TeamService, DocumentService, AuthService } from '../../../core/services';
import { TeamDocument } from '../../../core/models';

/**
 * Componente responsável por apresentar e gerir a lista de equipas.
 * Permite visualizar, expandir, criar e navegar para os detalhes de equipas.
 */
@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    //BadgeComponent,
    ModalComponent,
    InputComponent
  ],
  templateUrl: `./teams.component.html`
})
export class TeamsComponent {
  
  /**
   * Serviço responsável pela gestão de equipas.
   */
  teamService = inject(TeamService);

  /**
   * Serviço de documentos para operações de delete.
   */
  documentService = inject(DocumentService);

  /**
   * Serviço de autenticação para verificar owner.
   */
  authService = inject(AuthService);

  /**
   * Router para navegação entre rotas.
   */
  router = inject(Router);

  /**
   * Lista reativa de equipas proveniente do serviço.
   */
  teams = this.teamService.teams;

  /**
   * Signal para armazenar o texto de pesquisa de equipas.
   */
  searchQuery = signal('');

  /**
   * Lista filtrada de equipas com base no termo de pesquisa.
   * Filtra por nome da equipa e nome dos membros.
   */
  filteredTeams = computed(() => {
    const teams = this.teams();
    const query = this.searchQuery().toLowerCase().trim();
    
    if (!teams || !query) {
      return teams;
    }
    
    return teams.filter(team => {
      // Pesquisa no nome da equipa
      if (team.name.toLowerCase().includes(query)) {
        return true;
      }
      
      // Pesquisa nos nomes dos membros
      if (team.members?.some(member => member.name.toLowerCase().includes(query))) {
        return true;
      }
      
      // Pesquisa nos títulos dos documentos
      if (team.documents?.some(doc => doc.title.toLowerCase().includes(query))) {
        return true;
      }
      
      return false;
    });
  });

  /**
   * Signal que controla qual equipa está expandida na interface.
   */
  expandedTeam = signal<number | null>(1);

  /**
   * Signal que controla o menu de documento aberto.
   */
  openDocumentMenu = signal<number | null>(null);

  /**
   * Signal que controla a visibilidade do modal de criação de equipa.
   */
  isCreateModalOpen = signal(false);

  /**
   * Signal que controla a visibilidade do modal de delete.
   */
  isDeleteModalOpen = signal(false);

  /**
   * ID do documento a apagar.
   */
  documentToDelete = signal<number | null>(null);

  /**
   * Signal que controla o estado de loading do delete.
   */
  isDeleting = signal(false);

  /**
   * Signal que controla a visibilidade do modal de duplicate.
   */
  isDuplicateModalOpen = signal(false);

  /**
   * ID do documento a duplicar.
   */
  documentToDuplicate = signal<number | null>(null);

  /**
   * Signal que controla o estado de loading do duplicate.
   */
  isDuplicating = signal(false);

  /**
   * Nome da nova equipa a ser criada.
   */
  newTeamName = '';

  /**
   * Signal que controla o loading screen
   */
  loading = signal(true);

  //newTeamDescription = '';

  /**
   * Método de ciclo de vida chamado na inicialização do componente.
   * Carrega as equipas e subscreve a eventos de criação.
   */
  ngOnInit(): void {
    this.loadTeams();

    // Se a lista de equipas mudar
    this.teamService.teamCreated$.subscribe(() => {
      this.loadTeams();  // Recarrega a lista
    });
    
  }

  /**
   * Solicita ao serviço a obtenção da lista de equipas.
   */
  loadTeams(){
    this.loading.set(true);
    this.teams.set(null);
    this.teamService.getTeams().subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  /**
   * Expande ou recolhe uma equipa na interface.
   * @param teamId ID da equipa
   */
  toggleTeam(teamId: number): void {
    this.expandedTeam.update(current => current === teamId ? null : teamId);
  }

  /**
   * Navega para a página de detalhes de uma equipa.
   * @param teamId ID da equipa
   */
  handleViewTeamDetails(teamId: number): void {
    this.router.navigate(['/team-detail', teamId]);
  }

  /**
   * Navega para o editor de um documento.
   * @param docId ID do documento
   */
  handleDocumentClick(docId: number): void {
    this.router.navigate(['/editor', docId]);
  }

  /**
   * Abre/fecha o menu de opções de um documento.
   */
  toggleDocumentMenu(event: Event, docId: number): void {
    event.stopPropagation();
    this.openDocumentMenu.update(current => current === docId ? null : docId);
  }

  /**
   * Verifica se o utilizador atual é o criador do documento.
   */
  isDocumentOwner(doc: TeamDocument): boolean {
    const currentUser = this.authService.currentUser();
    return currentUser?.id === doc.createdById;
  }

  /**
   * Apaga um documento.
   */
  handleDeleteDocument(event: Event, docId: number): void {
    event.stopPropagation();
    this.openDocumentMenu.set(null);
    this.documentToDelete.set(docId);
    this.isDeleteModalOpen.set(true);
  }

  /**
   * Fecha o modal de confirmação de delete.
   */
  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.documentToDelete.set(null);
  }

  /**
   * Confirma e executa o delete do documento.
   */
  confirmDelete(): void {
    const docId = this.documentToDelete();
    if (!docId) return;

    this.isDeleting.set(true);
    this.documentService.deleteDocument(docId).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        // Recarregar equipas para atualizar a lista de documentos
        this.loadTeams();
      },
      error: (err) => {
        this.isDeleting.set(false);
        console.error('Error deleting document:', err);
      }
    });
  }

  /**
   * Abre o modal de confirmação de duplicação.
   */
  handleDuplicateDocument(event: Event, docId: number): void {
    event.stopPropagation();
    this.openDocumentMenu.set(null);
    this.documentToDuplicate.set(docId);
    this.isDuplicateModalOpen.set(true);
  }

  /**
   * Fecha o modal de confirmação de duplicate.
   */
  closeDuplicateModal(): void {
    this.isDuplicateModalOpen.set(false);
    this.documentToDuplicate.set(null);
  }

  /**
   * Confirma e executa a duplicação do documento.
   */
  confirmDuplicate(): void {
    const docId = this.documentToDuplicate();
    if (!docId) return;

    this.isDuplicating.set(true);
    this.documentService.duplicateDocument(docId).subscribe({
      next: (doc) => {
        this.isDuplicating.set(false);
        this.closeDuplicateModal();
        // Navegar para o novo documento duplicado
        this.router.navigate(['/editor', doc.id]);
      },
      error: (err) => {
        this.isDuplicating.set(false);
        console.error('Error duplicating document:', err);
      }
    });
  }

  /**
   * Cria uma nova equipa com o nome fornecido.
   */
  createTeam(): void {
    if (this.newTeamName) {
      this.loading.set(true);
      this.teamService.createTeam(this.newTeamName);
      this.isCreateModalOpen.set(false);
      this.newTeamName = '';
      //this.teamService.getTeams(this.http);
      //this.newTeamDescription = '';
    }
  }

  /**
   * Gera as iniciais de um nome.
   * @param name Nome completo
   * @returns Iniciais (máximo 2 letras)
   */
  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .join('')
      .slice(0, 2); // opcional: limita a 2 letras
  }

  /**
   * Converte o número da role para texto legível.
   * @param role Número da role (0=Member, 1=TeamAdmin, 2=Owner)
   * @returns Texto da role
   */
  getRoleName(role: number): string {
    const roleNames: { [key: number]: string } = {
      0: 'Member',
      1: 'Team Admin',
      2: 'Owner'
    };
    return roleNames[role] ?? 'Unknown';
  }

  /**
   * Retorna a classe CSS do badge com base na role.
   * @param role Número da role
   * @returns Classes CSS para o badge
   */
  getRoleBadgeClass(role: number): string {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (role) {
      case 2: return `${baseClasses} bg-[#155347] text-white`; // Owner
      case 1: return `${baseClasses} bg-blue-100 text-blue-800`; // Team Admin
      case 0: return `${baseClasses} bg-gray-100 text-gray-800`; // Member
      default: return `${baseClasses} bg-gray-100 text-gray-600`;
    }
  }
  
  /**
   * Converte uma data num formato relativo (ex: "2 hours ago").
   * @param input Data em formato string ou Date
   * @returns Texto relativo ao tempo decorrido
   */
  timeAgo(input: string | Date): string {
    var date = typeof input === "string" ? new Date(input) : input;
    var now = new Date();
  
    var seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
    var intervals: { label: string; seconds: number }[] = [
      { label: "year", seconds: 31536000 },
      { label: "month", seconds: 2592000 },
      { label: "day", seconds: 86400 },
      { label: "hour", seconds: 3600 },
      { label: "minute", seconds: 60 },
      { label: "second", seconds: 1 },
    ];
  
    for (var interval of intervals) {
      var count = Math.floor(seconds / interval.seconds);
      if (count > 0) {
        return `${count} ${interval.label}${count !== 1 ? "s" : ""} ago`;
      }
    }
  
    return "just now";
  }
}
