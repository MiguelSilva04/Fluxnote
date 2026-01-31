import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent } from '../../../shared/components/ui';
import { TeamService } from '../../../core/services';
import { TeamGet } from '../../../core/models';

/**
 * Componente responsável por apresentar os detalhes de uma equipa específica.
 * Obtém o ID da equipa através da rota e carrega os dados associados.
 */
@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    //ButtonComponent,
    CardComponent,
    CardContentComponent,
    BadgeComponent
  ],
  templateUrl: `./team-detail.component.html`
})
export class TeamDetailComponent {
  /**
   * Router para navegação entre rotas.
   */
  private router = inject(Router);

  /**
   * ActivatedRoute para acesso aos parâmetros da rota atual.
   */
  private route = inject(ActivatedRoute);

  /**
   * Serviço responsável pela gestão de equipas.
   */
  private teamService = inject(TeamService);

  /**
   * Signal que contém a equipa atualmente selecionada.
   */
  selectedTeam = this.teamService.selectedTeam;

  /**
   * Mapeamento de IDs de papéis para nomes legíveis.
   */
  roleNames: { [key: number]: string } = {
    0: 'Member',
    1: 'Team Admin',
    2: 'Owner'
  };
  
  loading = signal(true);

  /* members = [
    { id: 1, name: 'Alex Morgan', email: 'alex.morgan@fluxnote.com', role: 'Owner', initials: 'AM', color: '#155347' },
    { id: 2, name: 'Sarah Kim', email: 'sarah.kim@fluxnote.com', role: 'Team Admin', initials: 'SK', color: '#3B82F6' },
    { id: 3, name: 'John Doe', email: 'john.doe@fluxnote.com', role: 'Editor', initials: 'JD', color: '#8B5CF6' },
    { id: 4, name: 'Maria Santos', email: 'maria.santos@fluxnote.com', role: 'Viewer', initials: 'MS', color: '#EC4899' }
  ];

  recentActivity = [
    { id: 1, action: 'Sarah Kim edited "Project Plan"', time: '2 hours ago' },
    { id: 2, action: 'John Doe added a comment', time: '4 hours ago' },
    { id: 3, action: 'Alex Morgan shared a document', time: 'Yesterday' }
  ]; */

  /**
   * Método de ciclo de vida chamado na inicialização do componente.
   * Obtém o ID da equipa da rota e carrega os dados.
   */
  ngOnInit(): void {
    var teamId = Number(this.route.snapshot.paramMap.get('id'));
    //console.log("Id do details é ", teamId);
    this.loadTeam(teamId);
  }

  /**
   * Gera as iniciais de um nome.
   * @param name Nome completo
   * @returns Iniciais do nome (máximo 2 letras)
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
   * Carrega os dados da equipa a partir do serviço.
   * @param teamId ID da equipa
   */
  loadTeam(teamId: number) {
    this.loading.set(true);
    this.selectedTeam.set(null); // limpa a equipa anterior
    
    this.teamService.getTeamById(teamId).subscribe({
      next: (team) => {
        // Update local state or handle response
        this.selectedTeam.set(team);
        this.loading.set(false);
        //console.log(team);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  /**
   * Navega de volta para a lista de equipas.
   */
  goBack(): void {
    this.router.navigate(['/teams']);
  }
}
