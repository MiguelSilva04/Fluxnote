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

export interface CommentDto {
  id: number;
  documentId: number;
  userId?: string;
  createdByName?: string;
  createdByColor?: string;
  content: string;
  createdAt: string;
  rangeIndex?: number;
  rangeLength?: number; //range 
  replies: CommentDto[];
  resolved?: boolean;
  parentCommentId?: number;
}

export interface CreateCommentDto {
  userId?: string;
  documentId?: number;
  createdByColor?: string;
  content: string;
  rangeIndex?: number;
  rangeLength?: number;
  parentCommentId?: number;
}