import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { Observable } from 'rxjs';
import { Notification, NotificationPreferences } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);

  notifications = signal<Notification[]>([]);

  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  hasUnread = computed(() => this.unreadCount() > 0);

  loadNotifications(page = 1, pageSize = 20, unreadOnly?: boolean): void {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (unreadOnly !== undefined) {
      params = params.set('unreadOnly', unreadOnly);
    }

    this.http.get<Notification[]>('/api/notifications', { params }).subscribe({
      next: (data) => this.notifications.set(data),
      error: () => {}
    });
  }

  markAsRead(id: number): Observable<void> {
    return this.http.patch<void>(`/api/notifications/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.patch<void>('/api/notifications/read-all', {});
  }

  deleteNotification(id: number): Observable<void> {
    return this.http.delete<void>(`/api/notifications/${id}`);
  }

  deleteAllNotifications(): Observable<void> {
    return this.http.delete<void>('/api/notifications/all');
  }

  getPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>('/api/notifications/preferences');
  }

  updatePreferences(prefs: NotificationPreferences): Observable<void> {
    return this.http.put<void>('/api/notifications/preferences', prefs);
  }

  inviteToDocumentByEmail(documentId: number, email: string, role: number = 1): Observable<{ message: string }> {
    const params = new HttpParams()
      .set('documentId', documentId)
      .set('role', role);
    return this.http.post<{ message: string }>('/api/document-invites/by-email', { email }, { params });
  }

  inviteToTeamByEmail(teamId: number, email: string): Observable<{ message: string }> {
    const params = new HttpParams().set('teamId', teamId);
    return this.http.post<{ message: string }>('/api/team-invites/by-email', { email }, { params });
  }
}
