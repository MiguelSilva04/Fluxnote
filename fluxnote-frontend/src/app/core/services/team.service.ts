import { inject, Injectable, signal } from '@angular/core';
import { Team, TeamGet, TeamMember, TeamMemberToPost, TeamToPost } from '../models';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {AuthService } from './auth.service';
import { catchError, Observable, of, Subject, tap, throwError } from 'rxjs';



@Injectable({
  providedIn: 'root'
})

/**
 * Serviço responsável pela gestão de equipas.
 * Fornece métodos para obter, criar, selecionar e eliminar equipas,
 * bem como gerir o estado reativo associado.
 */
export class TeamService {
   /**
   * Serviço de autenticação injetado para obter dados do utilizador atual.
   */
  authService = inject(AuthService);

  /**
   * Utilizador atualmente autenticado
   */
  user = this.authService.currentUser();

  /**
   * Router Angular para navegação entre rotas.
   */
  private router = inject(Router);

  /**
   * Cliente HTTP para comunicação com a API.
   */
  private http = inject(HttpClient);

  /**
   * Subject utilizado para emitir eventos quando uma equipa é criada.
   */
  private teamCreatedSource = new Subject<void>();

  /**
   * Observable público para subscrição de eventos de criação de equipa.
   */
  teamCreated$ = this.teamCreatedSource.asObservable();

  /**
   * Signal que armazena a equipa atualmente selecionada.
   */
  readonly selectedTeam = signal<TeamGet | null>(null);

  /**
   * Signal que mantém a lista de equipas do utilizador.
   */
  readonly teams = signal<TeamGet[]| null>([/* 
    {
      id: 1,
      name: 'Projeto Alfa',
      members: 7,
      role: 'Owner',
      avatar: 'PA',
      lastActivity: '2 hours ago',
      documents: [
        { id: 1, name: 'Plano de Projeto Alfa', lastEdited: 'Yesterday', myRole: 'Owner' },
        { id: 2, name: 'Relatório Semanal Q3', lastEdited: '3 days ago', myRole: 'Editor' },
        { id: 3, name: 'Apresentação de Clientes', lastEdited: '1 week ago', myRole: 'Viewer' }
      ]
    },
    {
      id: 2,
      name: 'Desenvolvimento Beta',
      members: 12,
      role: 'Team Admin',
      avatar: 'DB',
      lastActivity: '1 day ago',
      documents: []
    },
    {
      id: 3,
      name: 'Marketing Gamma',
      members: 5,
      role: 'Member',
      avatar: 'MG',
      lastActivity: '5 hours ago',
      documents: []
    },
    {
      id: 4,
      name: 'Suporte Delta',
      members: 8,
      role: 'Member',
      avatar: 'SD',
      lastActivity: '3 days ago',
      documents: []
    }
   */]);

  /**
   * Signal privado que armazena equipas associadas ao utilizador.
   */
  private readonly _myTeams = signal<{ id: number; name: string; role: string; badge: string }[]>([/* 
    { id: 1, name: 'Minha Equipa de Projeto', role: 'Proprietário', badge: 'bg-[#155347]' },
    { id: 2, name: 'Equipa de Marketing Digital', role: 'Proprietário', badge: 'bg-[#155347]' },
    { id: 3, name: 'Esquadrão de Design Criativo', role: 'Proprietário', badge: 'bg-[#155347]' },
    { id: 4, name: 'Desenvolvimento de Produto', role: 'Proprietário', badge: 'bg-[#155347]' } */
  ]);

  
  /**
   * Exposição pública e somente leitura das equipas do utilizador.
   */
  readonly myTeams = this._myTeams.asReadonly();


  //saving = false;
  //errorMessage = '';

  /**
   * Obtém todas as equipas da API e atualiza o estado local.
   */
  getTeams() {
    return this.http.get<TeamGet[]>(`/api/teams/`)
  }

  /**
   * Obtém uma equipa específica pelo ID e define como selecionada.
   * @param id ID da equipa
   */
  getTeamById(id: number) {
    return this.http.get<TeamGet>(`/api/teams/${id}`)
      
  }

  /**
   * Cria uma nova equipa e associa o utilizador atual como proprietário.
   * @param teamName Nome da nova equipa
   */
  createTeam(teamName: string): void {
    //Criar as variáveis para o team e o owner
    
    var newTeam: TeamToPost = {
      name:teamName
    };

    /* if (!this.user) {
      throw new Error('User information is not available');
    }
    var owner: TeamMemberToPost = {
      name: this.user.fullName ?? '',
      email: this.user.email ?? '',
      role: 2,
      teamId: 0,
      userId: this.user.id
    };
 */

    
    // 1. Postar a Team
    this.http.post<{ id: number }>('/api/teams', newTeam)
      .subscribe({
        next: () => {
          this.notifyTeamCreated();
          this.router.navigate(['/teams']);
        },
        /* next: (teamResponse) => {
          var teamId = teamResponse.id;
          owner.teamId = teamId;
         // console.log('teamId:', teamId);

          // 2. Postar o Owner com teamId
          this.http.post<{ id: number }>('/api/teamMembers', owner).subscribe({
            next: (ownerResponse) => {
              var ownerId = ownerResponse.id;
              //console.log('ownerId:', ownerId);
              // 3. Atualizar Team com ownerId ( o request tem de ter o id, name e ownerId)
              
              this.http.put(`/api/teams/${teamId}`, {id: teamId, Name: teamName, OwnerId: ownerId}).subscribe({
                next: () => {
                  //console.log('Updated team with ownerId:', ownerId);
                  this.notifyTeamCreated();
                  this.router.navigate(['/teams']);
                },
                error: (err) => {
                  console.error('Error updating team with ownerId:', err);
                }
              });
            },
            error: (err) => {
              console.error('Error creating owner:', err);
            }
          });
        }, */
        error: (err) => {
          console.error('Error creating team:', err);
        }
      });
  }

  

  /**
   * Emite um evento notificando que uma equipa foi criada.
   */
  notifyTeamCreated() {
    this.teamCreatedSource.next();
  }

  /**
   * Elimina uma equipa pelo ID.
   * @param id ID da equipa a eliminar
   */
  deleteTeam(id: number) {
    return this.http.delete(`/api/teams/${id}`);
  }

  updateMemberRole(memberId: number, role: number): Observable<void> {
    return this.http.put<void>(`/api/teamMembers/${memberId}`, { role }).pipe(
      tap(() => {
        console.log('Member role updated successfully');
      }),
      catchError((err) => {
        console.error('Error updating member role:', err);
        return throwError(() => new Error('Error updating member role'));
      })
    );
  }

  removeMember(memberId: number): Observable<void> {
    return this.http.delete<void>(`/api/teamMembers/${memberId}`);
  }

  updateTeamName(id: number, name: string): Observable<void> {
    return this.http.patch<void>(`/api/teams/${id}`, { name });
  }

  /* updateTeam(id: number, updates: Partial<Team>, http: HttpClient): void {
    http.put<Team>(`/api/teams/${id}`, updates)
      .subscribe({
        next: (team) => {
          this._teams.update(teams =>
            teams.map(t => t.id === id ? { ...t, ...team } : t)
          );
        },
        error: (err) => {
          console.error(err);
        }
      });
  } */

  /* 
  deleteTeam(id: number): void {
    this.teams.update(teams => teams.filter(team => team.id !== id));
  } */
  
  /**
   * Retorna a variante visual do badge com base no papel do utilizador.
   * @param role Papel do utilizador na equipa
   */
  getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
    switch (role) {
      case 'Owner':
        return 'default';
      case 'Team Admin':
        return 'secondary';
      default:
        return 'outline';
    }
  }
}
