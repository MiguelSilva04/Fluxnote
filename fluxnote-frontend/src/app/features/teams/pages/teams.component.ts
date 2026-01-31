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
        // Update local state or handle response
        this.teams.set(teams);
        this.loading.set(false);
        //console.log(teams);
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
