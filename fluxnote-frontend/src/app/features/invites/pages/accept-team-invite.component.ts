import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonComponent, CardComponent, CardContentComponent } from '../../../shared/components/ui';
import { AuthService, TeamInviteService } from '../../../core/services';
import { TeamInviteDto, AcceptTeamInviteResponse } from '../../../core/models/team-invite.model';

@Component({
  selector: 'app-accept-team-invite',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TranslateModule,
    ButtonComponent,
    CardComponent,
    CardContentComponent
  ],
  template: `
    <div class="min-h-screen bg-[#f5f7f6] dark:bg-gray-900 flex items-center justify-center p-6">
      <div class="w-full max-w-md">
        <div class="text-center mb-6">
          <div class="mx-auto h-12 w-12 rounded-full bg-[#155347] text-white flex items-center justify-center">
            <lucide-icon name="file-text" class="h-6 w-6"></lucide-icon>
          </div>
          <h1 class="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">{{ 'ACCEPT_INVITE.TEAM_TITLE' | translate }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'ACCEPT_INVITE.TEAM_SUBTITLE' | translate }}</p>
        </div>

        @if (loading()) {
          <app-card>
            <app-card-content>
              <div class="flex flex-col items-center justify-center py-8 gap-3">
                <lucide-icon name="loader-circle" class="h-8 w-8 text-[#155347] animate-spin"></lucide-icon>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'ACCEPT_INVITE.LOADING' | translate }}</p>
              </div>
            </app-card-content>
          </app-card>
        }

        @if (error()) {
          <app-card>
            <app-card-content>
              <div class="text-center py-8">
                <lucide-icon name="circle-alert" class="h-10 w-10 text-red-500 mx-auto mb-4"></lucide-icon>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ 'ACCEPT_INVITE.NOT_AVAILABLE' | translate }}</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">{{ error() }}</p>
                <app-button (click)="goToDashboard()">{{ 'ACCEPT_INVITE.GO_TO_DASHBOARD' | translate }}</app-button>
              </div>
            </app-card-content>
          </app-card>
        }

        @if (invite() && !accepted() && !error()) {
          <app-card>
            <app-card-content>
              <div class="py-6">
                <div class="flex items-start gap-3 mb-5">
                  <div class="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <lucide-icon name="mail" class="h-5 w-5"></lucide-icon>
                  </div>
                  <div>
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ 'ACCEPT_INVITE.YOUVE_BEEN_INVITED' | translate }}</h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'ACCEPT_INVITE.JOIN_TEAM' | translate }}</p>
                  </div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6 text-left space-y-3">
                  <div>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ 'ACCEPT_INVITE.TEAM' | translate }}</span>
                    <p class="font-medium text-gray-900 dark:text-gray-100">{{ invite()!.teamName }}</p>
                  </div>
                  @if(invite()!.createdByName){
                  <div>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ 'ACCEPT_INVITE.INVITED_BY' | translate }}</span>
                    <p class="font-medium text-gray-900 dark:text-gray-100">{{ invite()!.createdByName }}</p>
                  </div>
                  }
                </div>
                <app-button
                  (click)="accept()"
                  [disabled]="accepting()"
                  class="w-full">
                  {{ accepting() ? ('ACCEPT_INVITE.ACCEPTING' | translate) : ('ACCEPT_INVITE.ACCEPT_INVITE' | translate) }}
                </app-button>
              </div>
            </app-card-content>
          </app-card>
        }

        @if (accepted()) {
          <app-card>
            <app-card-content>
              <div class="text-center py-8">
                <lucide-icon name="badge-check" class="h-10 w-10 text-emerald-600 mx-auto mb-4"></lucide-icon>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ 'ACCEPT_INVITE.INVITE_ACCEPTED' | translate }}</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-2" [innerHTML]="'ACCEPT_INVITE.NOW_ACCESS_TEAM' | translate:{ teamName: acceptResult()!.teamName }">
                </p>
                <div class="flex gap-3 justify-center">
                  <app-button variant="outline" (click)="goToTeam()">{{ 'ACCEPT_INVITE.VIEW_TEAM' | translate }}</app-button>
                </div>
              </div>
            </app-card-content>
          </app-card>
        }
      </div>
    </div>
  `
})
export class AcceptTeamInviteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inviteService = inject(TeamInviteService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);

  loading = signal(true);
  error = signal<string | null>(null);
  invite = signal<TeamInviteDto | null>(null);
  accepting = signal(false);
  accepted = signal(false);
  acceptResult = signal<AcceptTeamInviteResponse | null>(null);

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
      this.error.set(this.translate.instant('ACCEPT_INVITE.MISSING_TOKEN'));
      this.loading.set(false);
      return;
    }

    this.inviteService.getInviteInfo(token).subscribe({
      next: (invite) => {
        this.invite.set(invite);
        this.loading.set(false);
      },
      error: (err) => {
        const message = err.error?.errors?.[0] || err.error?.message || this.translate.instant('ACCEPT_INVITE.INVALID_OR_EXPIRED');
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
        const message = err.error?.errors?.[0] || err.error?.message || this.translate.instant('ACCEPT_INVITE.ERROR_ACCEPTING');
        this.error.set(message);
        this.invite.set(null);
        this.accepting.set(false);
      }
    });
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
