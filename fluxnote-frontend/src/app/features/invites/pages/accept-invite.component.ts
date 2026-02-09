import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent, CardComponent, CardContentComponent } from '../../../shared/components/ui';
import { DocumentInviteService, AuthService } from '../../../core/services';
import { DocumentInviteDto, AcceptInviteResponse } from '../../../core/models';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ButtonComponent,
    CardComponent,
    CardContentComponent
  ],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        @if (loading()) {
          <app-card>
            <app-card-content>
              <div class="text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p class="text-gray-500">A carregar convite...</p>
              </div>
            </app-card-content>
          </app-card>
        }

        @if (error()) {
          <app-card>
            <app-card-content>
              <div class="text-center py-8">
                <lucide-icon name="alert-circle" class="h-12 w-12 text-red-500 mx-auto mb-4"></lucide-icon>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Convite Invalido</h2>
                <p class="text-gray-500 mb-6">{{ error() }}</p>
                <app-button (click)="goToDashboard()">Ir para o Dashboard</app-button>
              </div>
            </app-card-content>
          </app-card>
        }

        @if (invite() && !accepted() && !error()) {
          <app-card>
            <app-card-content>
              <div class="text-center py-6">
                <lucide-icon name="file-text" class="h-12 w-12 text-emerald-600 mx-auto mb-4"></lucide-icon>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Foste convidado para um documento
                </h2>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left">
                  <div class="mb-3">
                    <span class="text-sm text-gray-500">Documento</span>
                    <p class="font-medium text-gray-900 dark:text-white">{{ invite()!.documentTitle }}</p>
                  </div>
                  <div class="mb-3">
                    <span class="text-sm text-gray-500">Equipa</span>
                    <p class="font-medium text-gray-900 dark:text-white">{{ invite()!.teamName }}</p>
                  </div>
                  <div class="mb-3">
                    <span class="text-sm text-gray-500">Convidado por</span>
                    <p class="font-medium text-gray-900 dark:text-white">{{ invite()!.createdByName }}</p>
                  </div>
                  <div>
                    <span class="text-sm text-gray-500">Permissao</span>
                    <p class="font-medium" [class]="invite()!.role === 1 ? 'text-emerald-600' : 'text-blue-600'">
                      {{ invite()!.role === 1 ? 'Editor' : 'Viewer' }}
                    </p>
                  </div>
                </div>
                <app-button
                  (click)="accept()"
                  [disabled]="accepting()"
                  class="w-full">
                  {{ accepting() ? 'A aceitar...' : 'Aceitar Convite' }}
                </app-button>
              </div>
            </app-card-content>
          </app-card>
        }

        @if (accepted()) {
          <app-card>
            <app-card-content>
              <div class="text-center py-8">
                <lucide-icon name="check-circle" class="h-12 w-12 text-emerald-600 mx-auto mb-4"></lucide-icon>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Convite Aceite!</h2>
                <p class="text-gray-500 mb-2">
                  Agora tens acesso ao documento <strong>{{ acceptResult()!.documentTitle }}</strong>
                </p>
                <p class="text-gray-500 mb-6">
                  na equipa <strong>{{ acceptResult()!.teamName }}</strong>
                  como <strong>{{ acceptResult()!.documentRole === 1 ? 'Editor' : 'Viewer' }}</strong>.
                </p>
                <div class="flex gap-3 justify-center">
                  <app-button (click)="goToDocument()">Abrir Documento</app-button>
                  <app-button variant="outline" (click)="goToTeam()">Ver Equipa</app-button>
                </div>
              </div>
            </app-card-content>
          </app-card>
        }
      </div>
    </div>
  `
})
export class AcceptInviteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inviteService = inject(DocumentInviteService);
  private authService = inject(AuthService);

  loading = signal(true);
  error = signal<string | null>(null);
  invite = signal<DocumentInviteDto | null>(null);
  accepting = signal(false);
  accepted = signal(false);
  acceptResult = signal<AcceptInviteResponse | null>(null);

  ngOnInit(): void {
    // verificar se esta autenticado
    if (!this.authService.isAuthenticated()) {
      // guarda o url atual para redirect depois do login
      const token = this.route.snapshot.params['token'];
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/invite/${token}` }
      });
      return;
    }

    const token = this.route.snapshot.params['token'];
    if (!token) {
      this.error.set('Token de convite em falta.');
      this.loading.set(false);
      return;
    }

    this.inviteService.getInviteInfo(token).subscribe({
      next: (invite) => {
        this.invite.set(invite);
        this.loading.set(false);
      },
      error: (err) => {
        const message = err.error?.errors?.[0] || err.error?.message || 'Convite invalido ou expirado.';
        this.error.set(message);
        this.loading.set(false);
      }
    });
  }

  accept(): void {
    const token = this.route.snapshot.params['token'];
    this.accepting.set(true);

    this.inviteService.acceptInvite(token).subscribe({
      next: (result) => {
        this.acceptResult.set(result);
        this.accepted.set(true);
        this.accepting.set(false);
      },
      error: (err) => {
        const message = err.error?.errors?.[0] || err.error?.message || 'Erro ao aceitar convite.';
        this.error.set(message);
        this.invite.set(null);
        this.accepting.set(false);
      }
    });
  }

  goToDocument(): void {
    const result = this.acceptResult();
    if (result) {
      this.router.navigate(['/editor', result.documentId]);
    }
  }

  goToTeam(): void {
    const result = this.acceptResult();
    if (result) {
      this.router.navigate(['/team-detail', result.teamId]);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}