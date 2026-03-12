import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { DocumentPermissionSummary } from '../models';

export interface CreateDocumentPermissionRequest {
  documentId: number;
  teamMemberId: number;
  role: number; // 0=Viewer, 1=Editor
}

@Injectable({
  providedIn: 'root'
})
export class DocumentPermissionService {
  private http = inject(HttpClient);

  getPermissionsByDocument(documentId: number): Observable<DocumentPermissionSummary[]> {
    return this.http.get<DocumentPermissionSummary[]>(`/api/documentPermissions/by-document/${documentId}`);
  }

  getEditorsByDocument(documentId: number): Observable<DocumentPermissionSummary[]> {
    return this.getPermissionsByDocument(documentId).pipe(
      map((permissions) => permissions.filter((permission) => permission.documentRole === 1))
    );
  }

  addPermission(request: CreateDocumentPermissionRequest): Observable<DocumentPermissionSummary> {
    return this.http.post<DocumentPermissionSummary>('/api/documentPermissions', request);
  }

  updatePermission(id: number, role: number): Observable<void> {
    return this.http.put<void>(`/api/documentPermissions/${id}`, { role });
  }

  removePermission(id: number): Observable<void> {
    return this.http.delete<void>(`/api/documentPermissions/${id}`);
  }
}
