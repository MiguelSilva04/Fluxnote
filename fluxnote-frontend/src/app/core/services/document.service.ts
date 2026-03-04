import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import {
  Document,
  DocumentDto,
  DocumentDetailDto,
  CreateDocumentRequest,
  Version,
  Comment,
  AISuggestion,
  DocumentContextDto,
  DocumentVersionDto,
  DocumentVersionDetailDto
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private http = inject(HttpClient);

  private readonly _documents = signal<DocumentDto[]>([]);
  private readonly _currentDocument = signal<DocumentDetailDto | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly documents = this._documents.asReadonly();
  readonly currentDocument = this._currentDocument.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Carrega a lista de documentos do utilizador
   * @param filters Filtros opcionais (teamId, search)
   */
  getDocuments(filters?: { teamId?: number; search?: string }): Observable<DocumentDto[]> {
    this._isLoading.set(true);
    this._error.set(null);

    let params = new HttpParams();
    if (filters?.teamId) {
      params = params.set('teamId', filters.teamId.toString());
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<DocumentDto[]>('/api/documents', { params }).pipe(
      tap(docs => {
        this._documents.set(docs);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        this._error.set(error.error?.message || 'Error loading documents');
        console.error('Error loading documents:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Pesquisa documentos sem afetar o estado global (para usar no header)
   * @param query Termo de pesquisa
   */
  searchDocuments(query: string): Observable<DocumentDto[]> {
    const params = new HttpParams().set('search', query);
    return this.http.get<DocumentDto[]>('/api/documents', { params });
  }

  /**
   * Carrega os detalhes de um documento específico
   * @param id ID do documento
   */
  getDocument(id: number): Observable<DocumentDetailDto> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.get<DocumentDetailDto>(`/api/documents/${id}`).pipe(
      tap(doc => {
        this._currentDocument.set(doc);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        this._error.set(error.error?.message || 'Error loading document');
        console.error('Error loading document:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Cria um novo documento
   * @param request Dados do documento (título, teamId ou teamName)
   */
  createDocument(request: CreateDocumentRequest): Observable<DocumentDto> {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http.post<DocumentDto>('/api/documents', request).pipe(
      tap(doc => {
        // Adiciona o novo documento à lista local
        this._documents.update(docs => [doc, ...docs]);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        this._error.set(error.error?.message || 'Error creating document');
        console.error('Error creating document:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Atualiza um documento existente (título e/ou conteúdo)
   * @param id ID do documento
   * @param data Dados a atualizar
   */
  updateDocument(id: number, data: { title?: string; content?: string }): Observable<DocumentDetailDto> {
    return this.http.put<DocumentDetailDto>(`/api/documents/${id}`, data).pipe(
      tap(doc => {
        this._currentDocument.set(doc);
        // Atualizar também na lista de documentos se existir
        this._documents.update(docs => 
          docs.map(d => d.id === id ? { ...d, title: doc.title, updatedAt: doc.updatedAt } : d)
        );
      }),
      catchError(error => {
        console.error('Error updating document:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Apaga um documento (soft delete - move para lixeira)
   * @param id ID do documento
   */
  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`/api/documents/${id}`).pipe(
      tap({
        next: () => {
          // Remove o documento da lista local
          this._documents.update(docs => docs.filter(d => d.id !== id));
          // Limpa o documento atual se for o que foi apagado
          if (this._currentDocument()?.id === id) {
            this._currentDocument.set(null);
          }
        }
      }),
      catchError(error => {
        console.error('Error deleting document:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Duplica um documento existente
   * @param id ID do documento a duplicar
   * @returns Observable com o documento duplicado
   */
  duplicateDocument(id: number): Observable<DocumentDto> {
    return this.http.post<DocumentDto>(`/api/documents/${id}/duplicate`, {}).pipe(
      tap({
        next: (doc) => {
          // Adiciona o novo documento à lista local
          this._documents.update(docs => [doc, ...docs]);
        }
      }),
      catchError(error => {
        console.error('Error duplicating document:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Gera um resumo do documento usando IA
   * @param id ID do documento
   * @returns Observable com o resumo gerado
   */
  generateSummary(id: number): Observable<{ summary: string }> {
    return this.http.post<{ summary: string }>(`/api/documents/${id}/summary`, {}).pipe(
      catchError(error => {
        console.error('Error generating summary:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Lista os ficheiros de contexto de um documento
   * @param documentId ID do documento
   */
  getContextFiles(documentId: number): Observable<DocumentContextDto[]> {
    return this.http.get<DocumentContextDto[]>(`/api/documents/${documentId}/context`).pipe(
      catchError(error => {
        console.error('Error loading context files:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Faz upload de um ficheiro de contexto para o documento
   * @param documentId ID do documento
   * @param file Ficheiro a carregar (PDF ou TXT)
   */
  uploadContextFile(documentId: number, file: File): Observable<DocumentContextDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<DocumentContextDto>(`/api/documents/${documentId}/context`, formData).pipe(
      catchError(error => {
        console.error('Error uploading context file:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Remove um ficheiro de contexto do documento
   * @param documentId ID do documento
   * @param contextId ID do ficheiro de contexto
   */
  deleteContextFile(documentId: number, contextId: number): Observable<void> {
    return this.http.delete<void>(`/api/documents/${documentId}/context/${contextId}`).pipe(
      catchError(error => {
        console.error('Error deleting context file:', error);
        return throwError(() => error);
      })
    );
  }

  // ===============================
  // Métodos da Lixeira (Trash)
  // ===============================

  /**
   * Carrega os documentos na lixeira do utilizador
   */
  getTrash(): Observable<DocumentDto[]> {
    return this.http.get<DocumentDto[]>('/api/documents/trash');
  }

  /**
   * Restaura um documento da lixeira
   * @param id ID do documento
   */
  restoreDocument(id: number): Observable<void> {
    return this.http.post<void>(`/api/documents/${id}/restore`, {});
  }

  /**
   * Elimina permanentemente um documento da lixeira
   * @param id ID do documento
   */
  permanentDeleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`/api/documents/${id}/permanent`);
  }

  /**
   * Limpa o documento atual
   */
  clearCurrentDocument(): void {
    this._currentDocument.set(null);
  }

  // ===============================
  // Métodos mock para funcionalidades futuas
  // ===============================
  
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

  // ===============================
  // Histórico de versões
  // ===============================

  /**
   * Lista as versões de um documento, ordenadas da mais recente para a mais antiga.
   * Requer acesso de Editor, TeamAdmin ou Owner.
   * @param documentId ID do documento
   */
  getDocumentVersions(documentId: number): Observable<DocumentVersionDto[]> {
    return this.http.get<DocumentVersionDto[]>(`/api/documents/${documentId}/versions`).pipe(
      catchError(error => {
        console.error('Error loading document versions:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtém os detalhes de uma versão específica, incluindo o conteúdo HTML.
   * @param documentId ID do documento
   * @param versionId ID da versão
   */
  getDocumentVersionDetail(documentId: number, versionId: number): Observable<DocumentVersionDetailDto> {
    return this.http.get<DocumentVersionDetailDto>(`/api/documents/${documentId}/versions/${versionId}`).pipe(
      catchError(error => {
        console.error('Error loading version detail:', error);
        return throwError(() => error);
      })
    );
  }
}
