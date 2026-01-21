import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, BadgeComponent, ModalComponent, InputComponent } from '../../../shared/components/ui';
import { TeamService } from '../../../core/services';

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
    BadgeComponent,
    ModalComponent,
    InputComponent
  ],
  templateUrl: `./teams.component.html`
})
export class TeamsComponent {
  private router = inject(Router);
  teamService = inject(TeamService);

  teams = this.teamService.teams;
  expandedTeam = signal<number | null>(1);
  isCreateModalOpen = signal(false);
  searchQuery = '';
  newTeamName = '';
  newTeamDescription = '';

  toggleTeam(teamId: number): void {
    this.expandedTeam.update(current => current === teamId ? null : teamId);
  }

  handleViewTeamDetails(teamId: number): void {
    this.router.navigate(['/team-detail']);
  }

  createTeam(): void {
    if (this.newTeamName) {
      this.teamService.createTeam(this.newTeamName, this.newTeamDescription);
      this.isCreateModalOpen.set(false);
      this.newTeamName = '';
      this.newTeamDescription = '';
    }
  }
}
