import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Folder } from '../models';

@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private http = inject(HttpClient);

  getFolders(teamId: number) {
    return this.http.get<Folder[]>(`/api/folders?teamId=${teamId}`);
  }

  createFolder(name: string, teamId: number) {
    return this.http.post<Folder>('/api/folders', { name, teamId });
  }

  updateFolder(id: number, name: string) {
    return this.http.put<void>(`/api/folders/${id}`, { name });
  }

  deleteFolder(id: number) {
    return this.http.delete<void>(`/api/folders/${id}`);
  }

  moveDocumentToFolder(folderId: number, docId: number) {
    return this.http.put<void>(`/api/folders/${folderId}/documents/${docId}`, {});
  }

  removeDocumentFromFolder(folderId: number, docId: number) {
    return this.http.delete<void>(`/api/folders/${folderId}/documents/${docId}`);
  }
}
