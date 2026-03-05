/**
 * DTO para listagem de documentos
 */
export interface DocumentDto {
  id: number;
  title: string;
  teamId: number;
  teamName: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  preview?: string; // Preview do texto (usado em pesquisas)
  folderId?: number;
  folderName?: string;
}

/**
 * DTO para detalhes do documento com conteúdo
 */
export interface DocumentDetailDto {
  id: number;
  title: string;
  teamId: number;
  teamName: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  content?: string; // Y.Doc em Base64
  plainText?: string;
  role?: string; // "Editor" | "Viewer"
  isOwner?: boolean; // true se o utilizador autenticado é o Owner da equipa
}

/**
 * Request para criar documento
 */
export interface CreateDocumentRequest {
  title: string;
  teamId?: number;
  teamName?: string;
}

/**
 * @deprecated Use DocumentDto instead - mantido para compatibilidade temporária
 */
export interface Document {
  id: number;
  title: string;
  lastEdited: string;
  sharedWith: number;
  status: 'active' | 'archived';
  content?: string;
}

export interface Version {
  id: number;
  number: number;
  author: string;
  description: string;
  timestamp: string;
}

export interface Comment {
  id: number;
  author: string;
  avatar: string;
  color: string;
  time: string;
  text: string;
  replies: Comment[];
  resolved?: boolean;
}

export interface AISuggestion {
  id: number;
  title: string;
  description: string;
  icon: string;
}

export interface DocumentContextDto {
  id: number;
  documentId: number;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  uploadedByName: string;
  hasExtractedText: boolean;
}

/** DTO para listagem de versões de um documento */
export interface DocumentVersionDto {
  id: number;
  documentId: number;
  authorName: string;
  createdAt: string;
  summary: string;
}

/** DTO para visualização de uma versão específica (inclui conteúdo HTML) */
export interface DocumentVersionDetailDto extends DocumentVersionDto {
  contentHtml: string | null;
}
