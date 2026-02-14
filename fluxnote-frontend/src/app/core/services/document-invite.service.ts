import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { AcceptDocumentInviteResponse, CreateDocumentInviteRequest, DocumentInviteDto } from "../models";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class DocumentInviteService {
    private http = inject(HttpClient);

    createInvite(request: CreateDocumentInviteRequest): Observable<DocumentInviteDto> {
        return this.http.post<DocumentInviteDto>('/api/document-invites', request);
    }
    
    getInvitesByDocument(documentId: number): Observable<DocumentInviteDto[]> {
        return this.http.get<DocumentInviteDto[]>(`/api/document-invites/by-document/${documentId}`);
      }
    
      getInviteInfo(token: string): Observable<DocumentInviteDto> {
        return this.http.get<DocumentInviteDto>(`/api/document-invites/${token}/info`);
      }
    
      acceptInvite(token: string): Observable<AcceptDocumentInviteResponse> {
        return this.http.post<AcceptDocumentInviteResponse>(`/api/document-invites/${token}/accept`, {});
      }
    
      revokeInvite(id: number): Observable<void> {
        return this.http.delete<void>(`/api/document-invites/${id}`);
      }
}