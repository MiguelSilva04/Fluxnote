import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import { ButtonComponent, CardComponent, CardContentComponent, BadgeComponent } from '../../../shared/components/ui';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    BadgeComponent
  ],
  templateUrl: `./team-detail.component.html`
})
export class TeamDetailComponent {
  private router = inject(Router);

  members = [
    { id: 1, name: 'Alex Morgan', email: 'alex.morgan@fluxnote.com', role: 'Owner', initials: 'AM', color: '#155347' },
    { id: 2, name: 'Sarah Kim', email: 'sarah.kim@fluxnote.com', role: 'Team Admin', initials: 'SK', color: '#3B82F6' },
    { id: 3, name: 'John Doe', email: 'john.doe@fluxnote.com', role: 'Editor', initials: 'JD', color: '#8B5CF6' },
    { id: 4, name: 'Maria Santos', email: 'maria.santos@fluxnote.com', role: 'Viewer', initials: 'MS', color: '#EC4899' }
  ];

  recentActivity = [
    { id: 1, action: 'Sarah Kim edited "Project Plan"', time: '2 hours ago' },
    { id: 2, action: 'John Doe added a comment', time: '4 hours ago' },
    { id: 3, action: 'Alex Morgan shared a document', time: 'Yesterday' }
  ];

  goBack(): void {
    this.router.navigate(['/teams']);
  }
}
