import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, BadgeComponent, ModalComponent, InputComponent } from '../../../shared/components/ui';
import { TeamService } from '../../../core/services';

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
   * Router para navegação entre rotas.
   */
  router = inject(Router);

  /**
   * Lista reativa de equipas proveniente do serviço.
   */
  teams = this.teamService.teams;

  /**
   * Signal que controla qual equipa está expandida na interface.
   */
  expandedTeam = signal<number | null>(1);

  /**
   * Signal que controla a visibilidade do modal de criação de equipa.
   */
  isCreateModalOpen = signal(false);

  /**
   * Texto utilizado para pesquisa de equipas.
   */
  searchQuery = '';

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
