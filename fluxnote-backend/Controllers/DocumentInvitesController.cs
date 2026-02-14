using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.DocumentInvites;
using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Fluxnote.Backend.Controllers
{
    [Route("api/document-invites")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class DocumentInvitesController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;
        private readonly UserManager<User> _userManager;
        private readonly IConfiguration _configuration;

        public DocumentInvitesController(
            FluxnoteServerContext context,
            UserManager<User> userManager,
            IConfiguration configuration
        )
        {
            _context = context;
            _userManager = userManager;
            _configuration = configuration;
        }

        /// <summary>
        /// Cria um convite por link para um documento.
        /// Apenas Owner ou TeamAdmin podem criar convites.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<DocumentInviteDto>> CreateInvite([FromBody] CreateDocumentInviteRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return new UnauthorizedObjectResult(new { message = "User not authenticated." });

            // Verificar se o documento existe
            if (request.Role != (int)DocumentRole.Viewer && request.Role != (int)DocumentRole.Editor)
            {
                return BadRequest(new
                {
                    message = "Invalid role.",
                    errors = new[] { "Document role must be Viewer (0) or Editor (1)." }
                });
            }

            // Validar ExpirationDays
            if (request.ExpirationDays < 1 || request.ExpirationDays > 30)
            {
                return BadRequest(new
                {
                    message = "Invalid expiration.",
                    errors = new[] { "Expiration must be between 1 and 30 days." }
                });
            }

            var document = await _context.Document
                    .Include(d => d.Team)
                    .FirstOrDefaultAsync(d => d.Id == request.DocumentId && !d.IsDeleted);

            if (document is null)
                return NotFound(new { message = "Document Not Found!" });

            // Verifica se o caller é Owner ou TeamAdmin da equipa
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == document.TeamId && m.UserId == userId);

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
                    errors = new[] { "Only Owner or Team Admin can create document invites." }
                });
            }

            // Gerar um token unico
            var token = Guid.NewGuid().ToString();

            var invite = new DocumentInvite
            {
                Token = token,
                DocumentId = request.DocumentId,
                CreatedByTeamMemberId = callerMember.Id,
                Role = (DocumentRole)request.Role,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(request.ExpirationDays),
                IsRevoked = false,
                UsedByUserId = null
            };

            _context.DocumentInvite.Add(invite);
            await _context.SaveChangesAsync();

            var frontendUrl = GetFrontendUrl();

            var dto = new DocumentInviteDto
            {
                Id = invite.Id,
                Token = invite.Token,
                DocumentId = invite.DocumentId,
                DocumentTitle = document.Title,
                TeamId = document.TeamId,
                TeamName = document.Team.Name,
                CreatedByName = callerMember.Name,
                Role = (int)invite.Role,
                ExpiresAt = invite.ExpiresAt,
                IsRevoked = invite.IsRevoked,
                IsUsed = invite.UsedByUserId != null,
                InviteUrl = $"{frontendUrl}/document-invite/{invite.Token}"
            };

            return CreatedAtAction(nameof(GetInviteInfo), new { token = invite.Token }, dto);
        }

        /// <summary>
        /// Lista convites ativos de um documento.
        /// Apenas Owner ou TeamAdmin podem ver.
        /// </summary>
        [HttpGet("by-document/{documentId}")]
        public async Task<ActionResult<IEnumerable<DocumentInviteDto>>> GetByDocument(int documentId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .Include(d => d.Team)
                .FirstOrDefaultAsync(d => d.Id == documentId);

            if (document == null)
                return NotFound(new { message = "Document not found." });

            // Verificar que o caller e Owner ou TeamAdmin
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == document.TeamId && m.UserId == userId);

            if (callerMember == null || (callerMember.Role != TeamRole.Owner && callerMember.Role != TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Owner or Team Admin can view document invites." }
                });
            }

            var frontendUrl = GetFrontendUrl();

            var invites = await _context.DocumentInvite
                .Include(di => di.CreatedBy)
                .Include(di => di.Document)
                    .ThenInclude(d => d.Team)
                .Where(di => di.DocumentId == documentId && !di.IsRevoked && di.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(di => di.CreatedAt)
                .Select(di => new DocumentInviteDto
                {
                    Id = di.Id,
                    Token = di.Token,
                    DocumentId = di.DocumentId,
                    DocumentTitle = di.Document.Title,
                    TeamId = di.Document.TeamId,
                    TeamName = di.Document.Team.Name,
                    CreatedByName = di.CreatedBy != null ? di.CreatedBy.Name : string.Empty,
                    Role = (int)di.Role,
                    ExpiresAt = di.ExpiresAt,
                    IsRevoked = di.IsRevoked,
                    IsUsed = di.UsedByUserId != null,
                    InviteUrl = $"{frontendUrl}/document-invite/{di.Token}"
                })
                .ToListAsync();

            return Ok(invites);
        }

        /// <summary>
        /// Obtém informação pública de um convite (preview antes de aceitar).
        /// Requer autenticação mas não precisa ser membro da equipa.
        /// </summary>
        [HttpGet("{token}/info")]
        public async Task<ActionResult<DocumentInviteDto>> GetInviteInfo(string token)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var invite = await _context.DocumentInvite
                .Include(di => di.Document)
                    .ThenInclude(d => d.Team)
                .Include(di => di.CreatedBy)
                .FirstOrDefaultAsync(di => di.Token == token);

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

            var dto = new DocumentInviteDto
            {
                Id = invite.Id,
                Token = invite.Token,
                DocumentId = invite.DocumentId,
                DocumentTitle = invite.Document.Title,
                TeamId = invite.Document.TeamId,
                TeamName = invite.Document.Team.Name,
                CreatedByName = invite.CreatedBy?.Name ?? string.Empty,
                Role = (int)invite.Role,
                ExpiresAt = invite.ExpiresAt,
                IsRevoked = invite.IsRevoked,
                IsUsed = false,
                InviteUrl = $"{frontendUrl}/document-invite/{invite.Token}"
            };

            return Ok(dto);
        }

        /// <summary>
        /// Aceita um convite. Cria TeamMember (se necessario) e DocumentPermission.
        /// </summary>
        [HttpPost("{token}/accept")]
        public async Task<ActionResult<AcceptDocumentInviteResponseDto>> AcceptInvite(string token)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
                return Unauthorized(new { message = "User not found." });

            var invite = await _context.DocumentInvite
                .Include(di => di.Document)
                    .ThenInclude(d => d.Team)
                .FirstOrDefaultAsync(di => di.Token == token);

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

            var teamId = invite.Document.TeamId;

            var existingMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == teamId && m.UserId == userId);

            TeamMember teamMember;

            if (existingMember != null)
            {
                teamMember = existingMember;

                // Se ja e Owner, nao precisa de DocumentPermission
                if (teamMember.Role == TeamRole.Owner)
                {
                    return BadRequest(new
                    {
                        message = "Already has access.",
                        errors = new[] { "You already have full access to all documents in this team." }
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

            // Verificar se ja tem DocumentPermission para este documento
            var existingPermission = await _context.DocumentPermission
                .FirstOrDefaultAsync(dp => dp.TeamMemberId == teamMember.Id && dp.DocumentId == invite.DocumentId);

            if (existingPermission != null)
            {
                return BadRequest(new
                {
                    message = "Permission already exists.",
                    errors = new[] { "You already have access to this document." }
                });
            }

            // Criar DocumentPermission com a role definida no convite
            // TeamAdmin recebe sempre Editor, independentemente da role do convite
            var effectiveRole = teamMember.Role == TeamRole.TeamAdmin
                ? DocumentRole.Editor
                : invite.Role;

            var permission = new DocumentPermission
            {
                DocumentId = invite.DocumentId,
                TeamMemberId = teamMember.Id,
                Role = effectiveRole,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DocumentPermission.Add(permission);

            // Marcar convite como usado
            invite.UsedByUserId = userId;

            await _context.SaveChangesAsync();

            var response = new AcceptDocumentInviteResponseDto
            {
                TeamId = teamId,
                DocumentId = invite.DocumentId,
                DocumentTitle = invite.Document.Title,
                TeamName = invite.Document.Team.Name,
                DocumentRole = (int)effectiveRole
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

            var invite = await _context.DocumentInvite
                .Include(di => di.Document)
                .FirstOrDefaultAsync(di => di.Id == id);

            if (invite == null)
                return NotFound(new { message = "Invite not found." });

            // Verificar que o caller e Owner ou TeamAdmin
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == invite.Document.TeamId && m.UserId == userId);

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
