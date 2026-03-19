using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Notifications;
using Fluxnote.Backend.Dtos.TeamInvites;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Services.Notifications;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Fluxnote.Backend.Controllers
{
    /// <summary>
    /// Controlador responsável por convites de entrada em equipas através de link e email.
    /// </summary>
    [Route("api/team-invites")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class TeamInvitesController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _configuration;
        private readonly INotificationService _notificationService;

        public TeamInvitesController(
            FluxnoteServerContext context,
            UserManager<User> userManager,
            IConfiguration configuration,
            INotificationService notificationService
        )
        {
            _context = context;
            _userManager = userManager;
            _configuration = configuration;
            _notificationService = notificationService;
        }

        /// <summary>
        /// Cria um convite por link para um documento.
        /// Apenas Owner ou TeamAdmin podem criar convites.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<TeamInviteDto>> CreateInvite([FromBody] CreateTeamInviteRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return new UnauthorizedObjectResult(new { message = "User not authenticated." });

            // Validar ExpirationDays
            if (request.ExpirationDays < 1 || request.ExpirationDays > 30)
            {
                return BadRequest(new
                {
                    message = "Invalid expiration.",
                    errors = new[] { "Expiration must be between 1 and 30 days." }
                });
            }

            var team = await _context.Team
                    .FirstOrDefaultAsync(t => t.Id == request.TeamId);

            if (team is null)
                return NotFound(new { message = "Team Not Found!" });

            // Verifica se o caller é Owner ou TeamAdmin da equipa
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == team.Id && m.UserId == userId);

            if (callerMember == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You are not a member of this team." }
                });
            }

            if (callerMember.Role != TeamRole.Owner && callerMember.Role != TeamRole.TeamAdmin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Owner or Team Admin can create team invites." }
                });
            }

            // Gerar um token unico
            var token = Guid.NewGuid().ToString();

            var invite = new TeamInvite
            {
                Team= team,
                Token = token,
                CreatedByTeamMemberId = callerMember.Id,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(request.ExpirationDays),
                IsRevoked = false,
                UsedByUserId = null
            };

            _context.TeamInvite.Add(invite);
            await _context.SaveChangesAsync();

            var frontendUrl = GetFrontendUrl();

            var dto = new TeamInviteDto
            {
                Id = invite.Id,
                Token = invite.Token,
                TeamId = team.Id,
                TeamName = team.Name,
                CreatedByName = callerMember.Name,
                ExpiresAt = invite.ExpiresAt,
                IsRevoked = invite.IsRevoked,
                IsUsed = invite.UsedByUserId != null,
                InviteUrl = $"{frontendUrl}/team-invite/{invite.Token}"
            };

            return CreatedAtAction(nameof(GetInviteInfo), new { token = invite.Token }, dto);
        }

        /// <summary>
        /// Lista convites ativos de uma equipa.
        /// Apenas Owner ou TeamAdmin podem ver.
        /// </summary>
        [HttpGet("by-team/{teamId}")]
        public async Task<ActionResult<IEnumerable<TeamInviteDto>>> GetByTeam(int teamId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var team = await _context.Team
                .FirstOrDefaultAsync(t => t.Id == teamId);

            if (team == null)
                return NotFound(new { message = "Team not found." });

            // Verificar que o caller e Owner ou TeamAdmin
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == team.Id && m.UserId == userId);

            if (callerMember == null || (callerMember.Role != TeamRole.Owner && callerMember.Role != TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Owner or Team Admin can view team invites." }
                });
            }

            var frontendUrl = GetFrontendUrl();

            var invites = await _context.TeamInvite
                .Include(ti => ti.CreatedBy)
                .Include(ti => ti.Team)
                .Where(ti => ti.TeamId == teamId && !ti.IsRevoked && ti.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(ti => ti.CreatedAt)
                .Select(ti => new TeamInviteDto
                {
                    Id = ti.Id,
                    Token = ti.Token,
                    TeamId = ti.TeamId,
                    TeamName = ti.Team.Name,
                    CreatedByName = ti.CreatedBy != null ? ti.CreatedBy.Name : string.Empty,
                    ExpiresAt = ti.ExpiresAt,
                    IsRevoked = ti.IsRevoked,
                    IsUsed = ti.UsedByUserId != null,
                    InviteUrl = $"{frontendUrl}/team-invite/{ti.Token}"
                })
                .ToListAsync();

            return Ok(invites);
        }

        /// <summary>
        /// Obtém informação pública de um convite (preview antes de aceitar).
        /// Requer autenticação mas não precisa ser membro da equipa.
        /// </summary>
        [HttpGet("{token}/info")]
        public async Task<ActionResult<TeamInviteDto>> GetInviteInfo(string token)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var invite = await _context.TeamInvite
                .Include(ti => ti.Team)
                .Include(ti => ti.CreatedBy)
                .FirstOrDefaultAsync(ti => ti.Token == token);

            if (invite == null)
                return NotFound(new { message = "Invite not found." });

            if (invite.IsRevoked)
            {
                return BadRequest(new
                {
                    message = "Invite revoked.",
                    errors = new[] { "This invite has been revoked." }
                });
            }

            if (invite.ExpiresAt <= DateTime.UtcNow)
            {
                return BadRequest(new
                {
                    message = "Invite expired.",
                    errors = new[] { "This invite has expired." }
                });
            }

            if (invite.UsedByUserId != null)
            {
                return BadRequest(new
                {
                    message = "Invite already used.",
                    errors = new[] { "This invite has already been used." }
                });
            }

            var frontendUrl = GetFrontendUrl();

            var dto = new TeamInviteDto
            {
                Id = invite.Id,
                Token = invite.Token,
                TeamId = invite.TeamId,
                TeamName = invite.Team.Name,
                CreatedByName = invite.CreatedBy?.Name ?? string.Empty,
                ExpiresAt = invite.ExpiresAt,
                IsRevoked = invite.IsRevoked,
                IsUsed = false,
                InviteUrl = $"{frontendUrl}/team-invite/{invite.Token}"
            };

            return Ok(dto);
        }

        /// <summary>
        /// Aceita um convite. Cria TeamMember (se necessario).
        /// </summary>
        [HttpPost("{token}/accept")]
        public async Task<ActionResult<AcceptTeamInviteResponseDto>> AcceptInvite(string token)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
                return Unauthorized(new { message = "User not found." });

            var invite = await _context.TeamInvite
                .Include(ti => ti.Team)
                .FirstOrDefaultAsync(ti => ti.Token == token);

            if (invite is null)
                return NotFound(new { message = "Invite not found" });

            if (invite.IsRevoked)
            {
                return BadRequest(new
                {
                    message = "Invite revoked.",
                    errors = new[] { "This invite has been revoked." }
                });
            }

            if (invite.ExpiresAt <= DateTime.UtcNow)
            {
                return BadRequest(new
                {
                    message = "Invite expired.",
                    errors = new[] { "This invite has expired." }
                });
            }

            if (invite.UsedByUserId != null)
            {
                return BadRequest(new
                {
                    message = "Invite already used.",
                    errors = new[] { "This invite has already been used." }
                });
            }

            var teamId = invite.TeamId;

            var existingMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == teamId && m.UserId == userId);

            TeamMember teamMember;

            if (existingMember != null)
            {
                teamMember = existingMember;

                // Se ja e Owner, nao precisa de TeamPermission
                if (teamMember.Role == TeamRole.Owner)
                {
                    return BadRequest(new
                    {
                        message = "Already has access.",
                        errors = new[] { "You already have full access this team." }
                    });
                }
            }
            else
            {
                // Criar novo TeamMember como Member
                teamMember = new TeamMember
                {
                    Name = user.FullName ?? user.Email ?? "Member",
                    UserId = userId,
                    TeamId = teamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };

                _context.TeamMember.Add(teamMember);
                await _context.SaveChangesAsync();
            }

            
            // Criar TeamPermission com a role definida no convite
            // TeamAdmin recebe sempre Editor, independentemente da role do convite
            var effectiveRole = teamMember.Role == TeamRole.TeamAdmin
                ? TeamRole.TeamAdmin
                : invite.Role;

            // Marcar convite como usado
            invite.UsedByUserId = userId;

            await _context.SaveChangesAsync();

            var response = new AcceptTeamInviteResponseDto
            {
                TeamId = teamId,
                TeamName = invite.Team.Name
            };

            return Ok(response);
        }

        /// <summary>
        /// Revoga um convite (torna-o inutilizavel).
        /// Apenas Owner ou TeamAdmin podem revogar.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> RevokeInvite(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var invite = await _context.TeamInvite
                .Include(di => di.Team)
                .FirstOrDefaultAsync(di => di.Id == id);

            if (invite == null)
                return NotFound(new { message = "Invite not found." });

            // Verificar que o caller e Owner ou TeamAdmin
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == invite.TeamId && m.UserId == userId);

            if (callerMember == null || (callerMember.Role != TeamRole.Owner && callerMember.Role != TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Owner or Team Admin can revoke invites." }
                });
            }

            invite.IsRevoked = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Convida um utilizador para uma equipa por email.
        /// Se o utilizador existir e tiver notificações ativas, envia notificação in-app e/ou email.
        /// Se não tiver nenhum canal ativo, retorna aviso para usar convite por link.
        /// Se o utilizador não existir, envia email de convite direto.
        /// </summary>
        [HttpPost("by-email")]
        public async Task<IActionResult> InviteByEmail(
            [FromBody] EmailInviteRequest request,
            [FromQuery] int teamId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var team = await _context.Team.FirstOrDefaultAsync(t => t.Id == teamId);
            if (team is null)
                return NotFound(new { message = "Team not found." });

            // Verificar permissões do caller
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == team.Id && m.UserId == userId);

            if (callerMember == null || (callerMember.Role != TeamRole.Owner && callerMember.Role != TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Owner or Team Admin can invite by email." }
                });
            }

            var callerUser = await _context.Users.FindAsync(userId);
            var callerName = callerUser?.FullName ?? callerUser?.Email;

            var targetUser = await _userManager.FindByEmailAsync(request.Email);

            if (targetUser == null)
            {
                return BadRequest(new { message = "No account found with this email address. The user must register first." });
            }

            // Verificar se já é membro
            var existingMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == team.Id && m.UserId == targetUser.Id);

            if (existingMember != null)
                return BadRequest(new { message = "User is already a member of this team." });

            // Verificar canais de notificação
            var hasChannels = await _notificationService.HasAnyChannelEnabledAsync(targetUser.Id);
            if (!hasChannels)
            {
                return BadRequest(new { message = "This user has all notifications disabled and cannot be invited by email. Please use a link invite instead." });
            }

            // Criar convite e enviar notificação
            var token = Guid.NewGuid().ToString();
            var invite = new TeamInvite
            {
                Team = team,
                Token = token,
                CreatedByTeamMemberId = callerMember.Id,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                IsRevoked = false,
                UsedByUserId = null
            };

            _context.TeamInvite.Add(invite);
            await _context.SaveChangesAsync();

            var frontendUrl = GetFrontendUrl();
            var inviteUrl = $"{frontendUrl}/team-invite/{token}";

            await _notificationService.SendAsync(new NotificationRequest
            {
                UserId = targetUser.Id,
                Type = NotificationType.TeamInvite,
                Title = "Team Invite",
                TitlePt = "Convite para equipa",
                Message = $"{callerName} invited you to the team \"{team.Name}\".",
                MessagePt = $"{callerName} convidou-te para a equipa \"{team.Name}\".",
                ReferenceId = team.Id,
                ReferenceType = "Team",
                ReferenceToken = token,
                ActorId = userId,
                EmailSubject = $"You've been invited to \"{team.Name}\" on Fluxnote",
                EmailSubjectPt = $"Foste convidado para a equipa \"{team.Name}\" no Fluxnote",
                EmailHtmlBody = BuildInviteEmailHtml(callerName, team.Name, "team", inviteUrl, false),
                EmailHtmlBodyPt = BuildInviteEmailHtml(callerName, team.Name, "equipa", inviteUrl, true)
            });

            return Ok(new { message = "Invite sent successfully." });
        }

        private static string BuildInviteEmailHtml(string inviterName, string resourceName, string resourceType, string inviteUrl, bool isPt = false)
        {
            var heading = isPt ? "Foste convidado!" : "You've been invited!";
            var body = isPt
                ? $"<b>{inviterName}</b> convidou-te para o {resourceType} <b>\"{resourceName}\"</b> no Fluxnote."
                : $"<b>{inviterName}</b> invited you to the {resourceType} <b>\"{resourceName}\"</b> on Fluxnote.";
            var btnText = isPt ? "Aceitar convite" : "Accept Invite";
            var fallback = isPt
                ? "Se o botão não funcionar, copie e cole este link no seu browser:"
                : "If the button doesn't work, copy and paste this link into your browser:";
            var footer = isPt
                ? "Recebeu este email porque alguém o convidou para colaborar no Fluxnote."
                : "You received this email because someone invited you to collaborate on Fluxnote.";
            var htmlLang = isPt ? "pt" : "en";

            return $@"
<!DOCTYPE html>
<html lang=""{htmlLang}"">
<head>
  <meta charset=""UTF-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
</head>
<body style=""margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f3f4f6; padding:40px 0;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""480"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.07);"">
          <tr>
            <td style=""background-color:#155347; padding:32px 40px; text-align:center;"">
              <h1 style=""margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:-0.5px;"">Fluxnote</h1>
            </td>
          </tr>
          <tr>
            <td style=""padding:40px;"">
              <h2 style=""margin:0 0 8px; color:#111827; font-size:22px; font-weight:600;"">{heading}</h2>
              <p style=""margin:0 0 24px; color:#6b7280; font-size:15px; line-height:1.6;"">
                {body}
              </p>
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td align=""center"" style=""padding:8px 0 32px;"">
                    <a href=""{inviteUrl}""
                       style=""display:inline-block; padding:14px 36px; background-color:#155347; color:#ffffff; text-decoration:none; font-size:15px; font-weight:600; border-radius:8px; letter-spacing:0.3px;"">
                      {btnText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style=""margin:0 0 16px; color:#9ca3af; font-size:13px; line-height:1.5;"">
                {fallback}
              </p>
              <p style=""margin:0; word-break:break-all; color:#155347; font-size:13px; line-height:1.5;"">
                {inviteUrl}
              </p>
            </td>
          </tr>
          <tr>
            <td style=""padding:24px 40px; background-color:#f9fafb; border-top:1px solid #e5e7eb; text-align:center;"">
              <p style=""margin:0; color:#9ca3af; font-size:12px; line-height:1.5;"">
                {footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
        }

        /// <summary>
        /// Deteta automaticamente o URL do frontend a partir do header Origin do pedido,
        /// com fallback para a configuração ou localhost.
        /// </summary>
        private string GetFrontendUrl()
        {
            var origin = Request.Headers.Origin.FirstOrDefault();
            return !string.IsNullOrEmpty(origin)
                ? origin.TrimEnd('/')
                : _configuration["Frontend:Url"] ?? "http://localhost:4200";
        }
    }
}
