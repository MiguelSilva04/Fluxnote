/**
 * Request para criar um convite de equipa
 */
export interface CreateTeamInviteRequest {
    teamId: number;
    expirationDays?: number; // Default: 7
}

/** 
* DTO de resposta de convite de equipa
*/
export interface TeamInviteDto {
    id: number;
    token: string;
    teamId: number;
    teamName: string;
    createdByName: string;
    expiresAt: string;
    isRevoked: boolean;
    isUsed: boolean;
    inviteUrl: string;
}

/**
 * Resposta ao aceitar um convite
 */
export interface AcceptTeamInviteResponse {
    teamId: number;
    teamName: string;
}
