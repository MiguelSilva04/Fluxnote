import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PanelStateService, NotificationService, LanguageService } from '../../core/services';
import { ButtonComponent } from '../../shared/components/ui';
import { NotificationType } from '../../core/models/notification.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule, ButtonComponent],
  template: `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
           [class.opacity-0]="!panelState.isNotificationsPanelOpen()"
           [class.pointer-events-none]="!panelState.isNotificationsPanelOpen()"
           (click)="panelState.closeNotificationsPanel()"></div>

      <!-- Side Panel -->
      <aside class="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out"
             [class.translate-x-full]="!panelState.isNotificationsPanelOpen()"
             [attr.inert]="!panelState.isNotificationsPanelOpen() ? '' : null">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'NOTIFICATIONS_PANEL.TITLE' | translate }}</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ 'NOTIFICATIONS_PANEL.UNREAD_COUNT' | translate:{ count: notificationService.unreadCount() } }}</p>
          </div>
          <button (click)="panelState.closeNotificationsPanel()" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <lucide-icon name="x" class="h-5 w-5 text-gray-500 dark:text-gray-400"></lucide-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          @if (notificationService.notifications().length === 0) {
            <div class="flex flex-col items-center justify-center h-full text-center px-6">
              <lucide-icon name="bell-off" class="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4"></lucide-icon>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'NOTIFICATIONS_PANEL.EMPTY' | translate }}</p>
            </div>
          }
          @for (notification of notificationService.notifications(); track notification.id) {
            <div
              (click)="onNotificationClick(notification)"
              [class]="'px-6 py-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer ' + (!notification.isRead ? 'bg-blue-50/40 dark:bg-blue-900/10' : '') + (deletingIds().has(notification.id) ? ' opacity-50 pointer-events-none' : '')"
            >
              <div class="flex gap-3">
                <div [class]="'flex items-center justify-center h-9 w-9 rounded-xl shrink-0 mt-0.5 ' + getIconBg(notification.type, notification.isRead)">
                  <lucide-icon
                    [name]="getIcon(notification.type)"
                    [class]="'h-4.5 w-4.5 ' + getIconColor(notification.type, notification.isRead)"
                  ></lucide-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-0.5">
                    <div class="flex items-center gap-2">
                      <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ languageService.activeLang() === 'pt' && notification.titlePt ? notification.titlePt : notification.title }}</h4>
                      @if (!notification.isRead) {
                        <span class="h-2 w-2 rounded-full bg-[#155347] dark:bg-emerald-400 shrink-0"></span>
                      }
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span [class]="'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ' + getTypeBadgeClass(notification.type)">
                        {{ getTypeLabel(notification.type) | translate }}
                      </span>
                      <button (click)="deleteNotification($event, notification.id)"
                              class="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              [disabled]="deletingIds().has(notification.id)"
                              [title]="'NOTIFICATIONS_PANEL.DELETE' | translate">
                        @if (deletingIds().has(notification.id)) {
                          <lucide-icon name="loader-circle" class="h-3.5 w-3.5 text-gray-400 animate-spin"></lucide-icon>
                        } @else {
                          <lucide-icon name="x" class="h-3.5 w-3.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"></lucide-icon>
                        }
                      </button>
                    </div>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{{ languageService.activeLang() === 'pt' && notification.messagePt ? notification.messagePt : notification.message }}</p>
                  <div class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <lucide-icon name="clock" class="h-3 w-3"></lucide-icon>
                    <span>{{ getTimeAgo(notification.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="flex flex-col gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <app-button variant="outline" customClass="w-full" (onClick)="markAllRead()">
            {{ 'NOTIFICATIONS_PANEL.MARK_ALL_READ' | translate }}
          </app-button>
          <app-button variant="outline" [disabled]="deletingAll()" customClass="w-full !text-red-600 !border-red-200 hover:!bg-red-50 dark:!text-red-400 dark:!border-red-800 dark:hover:!bg-red-900/20" (onClick)="deleteAll()">
            @if (deletingAll()) {
              <span class="flex items-center justify-center gap-2">
                <lucide-icon name="loader-circle" class="h-4 w-4 animate-spin"></lucide-icon>
                {{ 'NOTIFICATIONS_PANEL.DELETING' | translate }}
              </span>
            } @else {
              {{ 'NOTIFICATIONS_PANEL.DELETE_ALL' | translate }}
            }
          </app-button>
          <app-button (onClick)="panelState.closeNotificationsPanel()" customClass="w-full bg-[#155347] hover:bg-[#0d3d31]">
            {{ 'NOTIFICATIONS_PANEL.CLOSE' | translate }}
          </app-button>
        </div>
      </aside>
  `
})
export class NotificationsPanelComponent implements OnInit {
  panelState = inject(PanelStateService);
  notificationService = inject(NotificationService);
  private router = inject(Router);
  languageService = inject(LanguageService);
  private translateService = inject(TranslateService);

  deletingIds = signal<Set<number>>(new Set());
  deletingAll = signal(false);

  ngOnInit(): void {
    this.notificationService.loadNotifications();
  }

  getIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.DocumentInvite: return 'mail-plus';
      case NotificationType.TeamInvite: return 'user-plus';
      case NotificationType.CommentMention: return 'at-sign';
      case NotificationType.AddedToDocument: return 'file-plus';
      case NotificationType.CommentResolved: return 'circle-check';
      case NotificationType.CommentReply: return 'reply';
      case NotificationType.PasswordChanged: return 'shield-check';
      default: return 'bell';
    }
  }

  getIconBg(type: NotificationType, isRead: boolean): string {
    if (isRead) return 'bg-gray-100 dark:bg-gray-700';
    switch (type) {
      case NotificationType.DocumentInvite: return 'bg-blue-100 dark:bg-blue-900/40';
      case NotificationType.TeamInvite: return 'bg-violet-100 dark:bg-violet-900/40';
      case NotificationType.CommentMention: return 'bg-amber-100 dark:bg-amber-900/40';
      case NotificationType.AddedToDocument: return 'bg-emerald-100 dark:bg-emerald-900/40';
      case NotificationType.CommentResolved: return 'bg-green-100 dark:bg-green-900/40';
      case NotificationType.CommentReply: return 'bg-sky-100 dark:bg-sky-900/40';
      case NotificationType.PasswordChanged: return 'bg-red-100 dark:bg-red-900/40';
      default: return 'bg-gray-100 dark:bg-gray-700';
    }
  }

  getIconColor(type: NotificationType, isRead: boolean): string {
    if (isRead) return 'text-gray-500 dark:text-gray-400';
    switch (type) {
      case NotificationType.DocumentInvite: return 'text-blue-600 dark:text-blue-400';
      case NotificationType.TeamInvite: return 'text-violet-600 dark:text-violet-400';
      case NotificationType.CommentMention: return 'text-amber-600 dark:text-amber-400';
      case NotificationType.AddedToDocument: return 'text-emerald-600 dark:text-emerald-400';
      case NotificationType.CommentResolved: return 'text-green-600 dark:text-green-400';
      case NotificationType.CommentReply: return 'text-sky-600 dark:text-sky-400';
      case NotificationType.PasswordChanged: return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  }

  getTypeBadgeClass(type: NotificationType): string {
    switch (type) {
      case NotificationType.DocumentInvite: return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case NotificationType.TeamInvite: return 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
      case NotificationType.CommentMention: return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case NotificationType.AddedToDocument: return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case NotificationType.CommentResolved: return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case NotificationType.CommentReply: return 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
      case NotificationType.PasswordChanged: return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  }

  getTypeLabel(type: NotificationType): string {
    switch (type) {
      case NotificationType.DocumentInvite: return 'NOTIFICATIONS_PANEL.TYPE_DOCUMENT_INVITE';
      case NotificationType.TeamInvite: return 'NOTIFICATIONS_PANEL.TYPE_TEAM_INVITE';
      case NotificationType.CommentMention: return 'NOTIFICATIONS_PANEL.TYPE_MENTION';
      case NotificationType.AddedToDocument: return 'NOTIFICATIONS_PANEL.TYPE_ADDED';
      case NotificationType.CommentResolved: return 'NOTIFICATIONS_PANEL.TYPE_RESOLVED';
      case NotificationType.CommentReply: return 'NOTIFICATIONS_PANEL.TYPE_REPLY';
      case NotificationType.PasswordChanged: return 'NOTIFICATIONS_PANEL.TYPE_SECURITY';
      default: return 'NOTIFICATIONS_PANEL.TYPE_OTHER';
    }
  }


  getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return this.translateService.instant('NOTIFICATIONS_PANEL.JUST_NOW');
    if (diffMin < 60) return this.translateService.instant('NOTIFICATIONS_PANEL.MINUTES_AGO', { count: diffMin });
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return this.translateService.instant('NOTIFICATIONS_PANEL.HOURS_AGO', { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return this.translateService.instant('NOTIFICATIONS_PANEL.DAYS_AGO', { count: diffDays });
    return date.toLocaleDateString();
  }

  onNotificationClick(notification: any): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        this.notificationService.loadNotifications();
      });
    }

    // Convites navegam para a página de aceitação usando o token
    if (notification.type === NotificationType.DocumentInvite && notification.referenceToken) {
      this.panelState.closeNotificationsPanel();
      this.router.navigate(['/document-invite', notification.referenceToken]);
    } else if (notification.type === NotificationType.TeamInvite && notification.referenceToken) {
      this.panelState.closeNotificationsPanel();
      this.router.navigate(['/team-invite', notification.referenceToken]);
    } else if (notification.referenceType === 'Document' && notification.referenceId) {
      this.panelState.closeNotificationsPanel();
      this.router.navigate(['/editor', notification.referenceId]);
    } else if (notification.referenceType === 'Team' && notification.referenceId) {
      this.panelState.closeNotificationsPanel();
      this.router.navigate(['/team-detail', notification.referenceId]);
    }
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notificationService.loadNotifications();
    });
  }

  deleteNotification(event: Event, id: number): void {
    event.stopPropagation();
    const ids = new Set(this.deletingIds());
    ids.add(id);
    this.deletingIds.set(ids);
    this.notificationService.deleteNotification(id).subscribe({
      next: () => this.notificationService.loadNotifications(),
      error: () => {
        const updated = new Set(this.deletingIds());
        updated.delete(id);
        this.deletingIds.set(updated);
      }
    });
  }

  deleteAll(): void {
    this.deletingAll.set(true);
    this.notificationService.deleteAllNotifications().subscribe({
      next: () => {
        this.notificationService.loadNotifications();
        this.deletingAll.set(false);
      },
      error: () => this.deletingAll.set(false)
    });
  }
}
