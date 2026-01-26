import { Injectable, signal } from '@angular/core';
import { Team, TeamGet, TeamMember, TeamMemberToPost, TeamToPost } from '../models';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';



@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private readonly _teams = signal<TeamGet[]>([/* 
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

  private readonly _myTeams = signal<{ id: number; name: string; role: string; badge: string }[]>([
    { id: 1, name: 'Minha Equipa de Projeto', role: 'Proprietário', badge: 'bg-[#155347]' },
    { id: 2, name: 'Equipa de Marketing Digital', role: 'Proprietário', badge: 'bg-[#155347]' },
    { id: 3, name: 'Esquadrão de Design Criativo', role: 'Proprietário', badge: 'bg-[#155347]' },
    { id: 4, name: 'Desenvolvimento de Produto', role: 'Proprietário', badge: 'bg-[#155347]' }
  ]);

  readonly teams = this._teams.asReadonly();
  readonly myTeams = this._myTeams.asReadonly();

  //saving = false;
  //errorMessage = '';

  getTeams(http:HttpClient): void {
    http.get<TeamGet[]>(`/api/teams/`)
      .subscribe({
        next: (teams) => {
          // Update local state or handle response
          this._teams.set(teams) ;
          console.log(teams);
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  getTeamById(id: number, http: HttpClient): Team | void {
    http.get<Team>(`/api/teams/${id}`)
      .subscribe({
        next: (team) => {
          // Update local state or handle response
          return team;
          console.log(team);
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  createTeam(teamName: string,  http: HttpClient,  router: Router): void {
    //Criar as variáveis para o team e o owner
    var newTeam: TeamToPost = {
      name:teamName
    };

    var owner: TeamMemberToPost = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 2,
      teamId: 0
    };

    
    // 1. Postar a Team
    http.post<{ id: number }>('/api/teams', newTeam)
      .subscribe({
        next: (teamResponse) => {
          var teamId = teamResponse.id;
          owner.teamId = teamId;
          console.log('teamId:', teamId);

          // 2. Postar o Owner com teamId
          http.post<{ id: number }>('/api/teamMembers', owner).subscribe({
            next: (ownerResponse) => {
              var ownerId = ownerResponse.id;
              console.log('ownerId:', ownerId);
              // 3. Atualizar Team com ownerId ( o request tem de ter o id, name e ownerId)
              
              http.put(`/api/teams/${teamId}`, {id: teamId, Name: teamName, OwnerId: ownerId}).subscribe({
                next: () => {
                  router.navigate(['/teams']);
                  console.log('Atualizado team com ownerId:', ownerId);
                },
                error: (err) => {
                  console.error('Erro ao atualizar team com ownerId:', err);
                }
              });
            },
            error: (err) => {
              console.error('Erro ao criar owner:', err);
            }
          });
        },
        error: (err) => {
          console.error('Erro ao criar team:', err);
        }
      });
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

  deleteTeam(id: number): void {
    this._teams.update(teams => teams.filter(team => team.id !== id));
  }

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
