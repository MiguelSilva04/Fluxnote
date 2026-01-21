import { Injectable, signal } from '@angular/core';
// TODO: BACKEND INTEGRATION - Adicionar imports necessários quando backend estiver pronto
// import { HttpClient } from '@angular/common/http';
// import { Observable, catchError, throwError } from 'rxjs';
// import { environment } from '../../../environments/environment';
import { Document, Version, Comment, AISuggestion } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  // TODO: BACKEND INTEGRATION - Injectar HttpClient no construtor
  // constructor(private http: HttpClient) {}
  private readonly _documents = signal<Document[]>([
    { id: 1, title: 'Q4 Marketing Strategy', lastEdited: '2 hours ago', sharedWith: 3, status: 'active' },
    { id: 2, title: 'Product Roadmap 2024', lastEdited: 'Yesterday', sharedWith: 5, status: 'active' },
    { id: 3, title: 'Team Meeting Notes', lastEdited: '3 days ago', sharedWith: 2, status: 'archived' }
  ]);

  private readonly _currentDocument = signal<Document | null>(null);
  private readonly _isLoading = signal(false);

  readonly documents = this._documents.asReadonly();
  readonly currentDocument = this._currentDocument.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  // TODO: BACKEND INTEGRATION - Alterar para método assíncrono que chama o backend
  // Endpoint: GET /api/documents/{id}/versions (se existir no Sprint 1)
  // 
  // getVersions(documentId: number): Observable<Version[]> {
  //   return this.http.get<Version[]>(`${environment.apiUrl}/api/documents/${documentId}/versions`)
  //     .pipe(
  //       catchError((error) => {
  //         console.error('Error loading versions:', error);
  //         return throwError(() => error);
  //       })
  //     );
  // }
  
  // TEMPORÁRIO: Mock data para desenvolvimento sem backend
  getVersions(): Version[] {
    return [
      { id: 7, number: 7, author: 'João Silva', description: 'Added introduction section and fixed spelling errors.', timestamp: '2 hours ago' },
      { id: 6, number: 6, author: 'Ana Clara', description: 'Revised chapter 3 and formatting adjustments.', timestamp: 'Yesterday at 14:30' },
      { id: 5, number: 5, author: 'Pedro Santos', description: 'Implemented team feedback for the Conclusion section.', timestamp: '3 days ago' }
    ];
  }

  getComments(): Comment[] {
    return [
      { id: 1, author: 'Michael Chen', avatar: 'MC', color: 'bg-blue-500', time: '2 hours ago', text: "Consider rephrasing the introduction for better clarity on AI's impact.", replies: [] },
      { id: 2, author: 'Sarah Kim', avatar: 'SK', color: 'bg-purple-500', time: '4 hours ago', text: 'The section on quantum computing is very strong.', replies: [] }
    ];
  }

  getAISuggestions(): AISuggestion[] {
    return [
      { id: 1, title: 'Summarize document', description: 'Get a concise summary of the entire document', icon: '📝' },
      { id: 2, title: 'Improve writing', description: 'Enhance clarity and style', icon: '✨' },
      { id: 3, title: 'Generate content from prompt', description: 'Create new content based on your instructions', icon: '🤖' }
    ];
  }

  setCurrentDocument(doc: Document): void {
    this._currentDocument.set(doc);
  }

  createDocument(teamId: number): Document {
    const newDoc: Document = {
      id: Date.now(),
      title: 'Untitled Document',
      lastEdited: 'Just now',
      sharedWith: 0,
      status: 'active'
    };
    this._documents.update(docs => [...docs, newDoc]);
    return newDoc;
  }

  updateDocument(id: number, updates: Partial<Document>): void {
    this._documents.update(docs =>
      docs.map(doc => doc.id === id ? { ...doc, ...updates } : doc)
    );
  }

  deleteDocument(id: number): void {
    this._documents.update(docs => docs.filter(doc => doc.id !== id));
  }

  // TODO: BACKEND INTEGRATION - Implementar métodos para integração com backend
  // 
  // /**
  //  * Carrega metadados do documento (título, última atualização, etc.)
  //  * Endpoint: GET /api//documents/{id}
  //  */
  // loadDocument(id: number): Observable<Document> {
  //   return this.http.get<Document>(`${environment.apiUrl}/api//documents/${id}`)
  //     .pipe(
  //       catchError((error) => {
  //         console.error('Error loading document:', error);
  //         return throwError(() => error);
  //       })
  //     );
  // }
  //
  // /**
  //  * Carrega conteúdo do documento (HTML)
  //  * Endpoint: GET /api//documents/{id}/content
  //  */
  // loadDocumentContent(id: number): Observable<string> {
  //   return this.http.get(`${environment.apiUrl}/api//documents/${id}/content`, {
  //     responseType: 'text'
  //   }).pipe(
  //     catchError((error) => {
  //       console.error('Error loading document content:', error);
  //       return throwError(() => error);
  //     })
  //   );
  // }
  //
  // /**
  //  * Atualiza metadados do documento (título, etc.)
  //  * Endpoint: PUT /api//documents/{id}
  //  */
  // updateDocumentMetadata(id: number, updates: { title?: string }): Observable<void> {
  //   return this.http.put<void>(`${environment.apiUrl}/api/documents/${id}`, updates)
  //     .pipe(
  //       catchError((error) => {
  //         console.error('Error updating document metadata:', error);
  //         return throwError(() => error);
  //       })
  //     );
  // }
  //
  // /**
  //  * Guarda conteúdo do documento (HTML)
  //  * Endpoint: PUT /api/documents/{id}/content
  //  */
  // saveDocumentContent(id: number, content: string): Observable<void> {
  //   return this.http.put<void>(`${environment.apiUrl}/api/documents/${id}/content`, { content })
  //     .pipe(
  //       catchError((error) => {
  //         console.error('Error saving document content:', error);
  //         return throwError(() => error);
  //       })
  //     );
  // }
  //
  // /**
  //  * Lista documentos do utilizador
  //  * Endpoint: GET /api/documents
  //  */
  // getDocuments(filters?: { teamId?: number; search?: string }): Observable<Document[]> {
  //   let url = `${environment.apiUrl}/api/documents`;
  //   const params = new URLSearchParams();
  //   if (filters?.teamId) params.append('teamId', filters.teamId.toString());
  //   if (filters?.search) params.append('search', filters.search);
  //   if (params.toString()) url += `?${params.toString()}`;
  //
  //   return this.http.get<Document[]>(url)
  //     .pipe(
  //       catchError((error) => {
  //         console.error('Error loading documents:', error);
  //         return throwError(() => error);
  //       })
  //     );
  // }
  //
  // /**
  //  * Cria novo documento
  //  * Endpoint: POST /api/documents
  //  */
  // createDocument(teamId?: number): Observable<Document> {
  //   const payload = teamId ? { teamId } : {};
  //   return this.http.post<Document>(`${environment.apiUrl}/api/documents`, payload)
  //     .pipe(
  //       catchError((error) => {
  //         console.error('Error creating document:', error);
  //         return throwError(() => error);
  //       })
  //     );
  // }
}
