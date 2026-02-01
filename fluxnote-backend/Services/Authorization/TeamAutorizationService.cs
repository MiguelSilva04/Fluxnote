using Fluxnote.Backend.Data;
using Fluxnote.Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Fluxnote.Backend.Services.Authorization;

public class TeamAutorizationService
{
    private readonly FluxnoteServerContext _context;
    public TeamAutorizationService(FluxnoteServerContext context)
    {
        _context = context;
    }

    public async Task<bool> IsTeamOwnerAsync(int teamId, string userId)
    {
        var membership = await GetTeamMemberAsync(teamId, userId);
        return membership != null && membership.Role == TeamRole.Owner;
    }

    public async Task<bool> IsTeamOwnerOrAdminAsync(int teamId, string userId)
    {
        var membership = await GetTeamMemberAsync(teamId, userId);

        return membership != null && (membership.Role == TeamRole.Owner || membership.Role == TeamRole.TeamAdmin);
    }

    public async Task<TeamMember?> GetTeamMemberAsync(int teamId, string userId)
    {
        return await _context.TeamMember
            .FirstOrDefaultAsync(m => m.TeamId == teamId && m.UserId == userId);
    }
}
