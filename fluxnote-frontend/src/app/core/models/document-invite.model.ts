/**
 * Request para criar um convite de documento
 */
export interface CreateDocumentInviteRequest {
    documentId: number;
    role: number; // 0 = Viewer, 1 = Editor
    expirationDays?: number; // Default: 7
}

/**
* DTO de resposta de convite de documento
*/
export interface DocumentInviteDto {
    id: number;
    token: string;
    documentId: number;
    documentTitle: string;
    teamId: number;
    teamName: string;
    createdByName: string;
    role: number; // 0=Viewer, 1=Editor
    expiresAt: string;
    isRevoked: boolean;
    isUsed: boolean;
    inviteUrl: string;
}

/**
 * Resposta ao aceitar um convite
 */
export interface AcceptDocumentInviteResponse {
    teamId: number;
    documentId: number;
    documentTitle: string;
    teamName: string;
    documentRole: number; // 0=Viewer, 1=Editor
}
