using Fluxnote.Backend.Data;
using Fluxnote.Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Fluxnote.Backend.Services.Authorization;

/// <summary>
/// Serviço de autorização para validar papéis de utilizador no contexto de equipa.
/// </summary>
public class TeamAutorizationService
{
    private readonly FluxnoteServerContext _context;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="TeamAutorizationService"/>.
    /// </summary>
    /// <param name="context">Contexto de acesso à base de dados.</param>
    public TeamAutorizationService(FluxnoteServerContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Verifica se o utilizador é Owner da equipa.
    /// </summary>
    /// <param name="teamId">ID da equipa.</param>
    /// <param name="userId">ID do utilizador.</param>
    /// <returns><c>true</c> quando o utilizador é Owner; caso contrário, <c>false</c>.</returns>
    public async Task<bool> IsTeamOwnerAsync(int teamId, string userId)
    {
        var membership = await GetTeamMemberAsync(teamId, userId);
        return membership != null && membership.Role == TeamRole.Owner;
    }

    /// <summary>
    /// Verifica se o utilizador é Owner ou TeamAdmin da equipa.
    /// </summary>
    /// <param name="teamId">ID da equipa.</param>
    /// <param name="userId">ID do utilizador.</param>
    /// <returns><c>true</c> quando o utilizador é Owner/Admin; caso contrário, <c>false</c>.</returns>
    public async Task<bool> IsTeamOwnerOrAdminAsync(int teamId, string userId)
    {
        var membership = await GetTeamMemberAsync(teamId, userId);

        return membership != null && (membership.Role == TeamRole.Owner || membership.Role == TeamRole.TeamAdmin);
    }

    /// <summary>
    /// Obtém o registo de associação de um utilizador a uma equipa.
    /// </summary>
    /// <param name="teamId">ID da equipa.</param>
    /// <param name="userId">ID do utilizador.</param>
    /// <returns>O membro da equipa, ou <c>null</c> se o utilizador não pertencer à equipa.</returns>
    public async Task<TeamMember?> GetTeamMemberAsync(int teamId, string userId)
    {
        return await _context.TeamMember
            .FirstOrDefaultAsync(m => m.TeamId == teamId && m.UserId == userId);
    }
}
