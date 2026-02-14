import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { AcceptTeamInviteResponse, CreateTeamInviteRequest, TeamInviteDto } from "../models";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class TeamInviteService {
    private http = inject(HttpClient);

    createInvite(request: CreateTeamInviteRequest): Observable<TeamInviteDto> {
        return this.http.post<TeamInviteDto>('/api/team-invites', request);
    }
    
    getInvitesByTeam(teamId: number): Observable<TeamInviteDto[]> {
        return this.http.get<TeamInviteDto[]>(`/api/team-invites/by-team/${teamId}`);
      }
    
      getInviteInfo(token: string): Observable<TeamInviteDto> {
        return this.http.get<TeamInviteDto>(`/api/team-invites/${token}/info`);
      }
    
      acceptInvite(token: string): Observable<AcceptTeamInviteResponse> {
        return this.http.post<AcceptTeamInviteResponse>(`/api/team-invites/${token}/accept`, {});
      }
    
      revokeInvite(id: number): Observable<void> {
        return this.http.delete<void>(`/api/team-invites/${id}`);
      }
}