import { Injectable, signal } from '@angular/core';
import { Team } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private readonly _teams = signal<Team[]>([
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
      role: 'Viewer',
      avatar: 'SD',
      lastActivity: '3 days ago',
      documents: []
    }
  ]);

  private readonly _myTeams = signal<{ id: number; name: string; role: string; badge: string }[]>([
    { id: 1, name: 'Minha Equipa de Projeto', role: 'Proprietário', badge: 'bg-[#155347]' },
    { id: 2, name: 'Equipa de Marketing Digital', role: 'Proprietário', badge: 'bg-[#155347]' },
    { id: 3, name: 'Esquadrão de Design Criativo', role: 'Proprietário', badge: 'bg-[#155347]' },
    { id: 4, name: 'Desenvolvimento de Produto', role: 'Proprietário', badge: 'bg-[#155347]' }
  ]);

  readonly teams = this._teams.asReadonly();
  readonly myTeams = this._myTeams.asReadonly();

  getTeamById(id: number): Team | undefined {
    return this._teams().find(team => team.id === id);
  }

  createTeam(name: string, description: string): Team {
    const newTeam: Team = {
      id: Date.now(),
      name,
      members: 1,
      role: 'Owner',
      avatar: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      lastActivity: 'Just now',
      documents: []
    };
    this._teams.update(teams => [...teams, newTeam]);
    return newTeam;
  }

  updateTeam(id: number, updates: Partial<Team>): void {
    this._teams.update(teams =>
      teams.map(team => team.id === id ? { ...team, ...updates } : team)
    );
  }

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
