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
