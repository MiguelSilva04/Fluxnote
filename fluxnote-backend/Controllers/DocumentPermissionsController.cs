using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Documents;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Services.Notifications;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Fluxnote.Backend.Controllers
{
    /// <summary>
    /// Controlador responsável pela gestão de permissões de documentos por membro.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class DocumentPermissionsController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;
        private readonly INotificationService _notificationService;

        public DocumentPermissionsController(FluxnoteServerContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        /// <summary>
        /// Lista as permissões de um documento específico.
        /// Requer ser membro da equipa do documento.
        /// </summary>
        [HttpGet("by-document/{documentId}")]
        public async Task<ActionResult<IEnumerable<DocumentPermissionDto>>> GetByDocument(int documentId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document.FindAsync(documentId);
            if (document == null)
                return NotFound(new { message = "Document not found." });

            // Verificar que o caller é membro da equipa
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

            var permissions = await _context.DocumentPermission
                .Include(dp => dp.TeamMember)
                .Where(dp => dp.DocumentId == documentId)
                .Select(dp => new DocumentPermissionDto
                {
                    Id = dp.Id,
                    DocumentId = dp.DocumentId,
                    TeamMemberId = dp.TeamMemberId,
                    MemberName = dp.TeamMember.Name,
                    MemberRole = (int)dp.TeamMember.Role,
                    DocumentRole = (int)dp.Role
                })
                .ToListAsync();

            return Ok(permissions);
        }

        /// <summary>
        /// Adiciona uma permissão de documento a um membro.
        /// Requer Owner ou TeamAdmin. Não pode adicionar Owner/TeamAdmin (já têm acesso implícito).
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<DocumentPermissionDto>> CreatePermission([FromBody] CreateDocumentPermissionRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            // Validar DocumentRole
            if (request.Role != (int)DocumentRole.Viewer && request.Role != (int)DocumentRole.Editor)
            {
                return BadRequest(new
                {
                    message = "Invalid role.",
                    errors = new[] { "Document role must be Viewer (0) or Editor (1)." }
                });
            }

            var document = await _context.Document.FindAsync(request.DocumentId);
            if (document == null)
                return NotFound(new { message = "Document not found." });

            // Verificar que o caller é Owner ou TeamAdmin da equipa
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
                    errors = new[] { "Only Owner or Team Admin can manage document permissions." }
                });
            }

            // Verificar que o target member existe e pertence à mesma equipa
            var targetMember = await _context.TeamMember.FindAsync(request.TeamMemberId);
            if (targetMember == null || targetMember.TeamId != document.TeamId)
            {
                return NotFound(new { message = "Team member not found in this team." });
            }

            // Não adicionar permissão a Owner
            if (targetMember.Role == TeamRole.Owner)
            {
                return BadRequest(new
                {
                    message = "Invalid operation.",
                    errors = new[] { "Owner already has implicit access to all documents." }
                });
            }

            // TeamAdmin só pode receber permissão explícita se o caller for Owner
            if (targetMember.Role == TeamRole.TeamAdmin && callerMember.Role != TeamRole.Owner)
            {
                return BadRequest(new
                {
                    message = "Invalid operation.",
                    errors = new[] { "Only the Owner can add permissions for a Team Admin." }
                });
            }

            // Verificar se já existe permissão
            var existingPermission = await _context.DocumentPermission
                .FirstOrDefaultAsync(dp => dp.DocumentId == request.DocumentId && dp.TeamMemberId == request.TeamMemberId);

            if (existingPermission != null)
            {
                return BadRequest(new
                {
                    message = "Permission already exists.",
                    errors = new[] { "This member already has a permission for this document." }
                });
            }

            // TeamAdmin recebe sempre Editor (não pode ser Viewer)
            var effectiveRole = targetMember.Role == TeamRole.TeamAdmin
                ? DocumentRole.Editor
                : (DocumentRole)request.Role;

            var permission = new DocumentPermission
            {
                DocumentId = request.DocumentId,
                TeamMemberId = request.TeamMemberId,
                Role = effectiveRole,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DocumentPermission.Add(permission);
            await _context.SaveChangesAsync();

            // Notificar o utilizador que foi adicionado ao documento
            if (targetMember.UserId != userId)
            {
                var callerUser = await _context.Users.FindAsync(userId);
                var callerName = callerUser?.FullName ?? callerUser?.Email;
                var docTitle = document.Title;

                await _notificationService.SendAsync(new NotificationRequest
                {
                    UserId = targetMember.UserId,
                    Type = NotificationType.AddedToDocument,
                    Title = "Added to document",
                    TitlePt = "Adicionado a documento",
                    Message = $"{callerName} added you to \"{docTitle}\".",
                    MessagePt = $"{callerName} adicionou-te a \"{docTitle}\".",
                    ReferenceId = document.Id,
                    ReferenceType = "Document",
                    ActorId = userId
                });
            }

            var dto = new DocumentPermissionDto
            {
                Id = permission.Id,
                DocumentId = permission.DocumentId,
                TeamMemberId = permission.TeamMemberId,
                MemberName = targetMember.Name,
                MemberRole = (int)targetMember.Role,
                DocumentRole = (int)permission.Role
            };

            return CreatedAtAction(nameof(GetByDocument), new { documentId = permission.DocumentId }, dto);
        }

        /// <summary>
        /// Atualiza a DocumentRole de uma permissão existente.
        /// Requer Owner ou TeamAdmin. Não pode alterar permissão de Owner/TeamAdmin.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePermission(int id, [FromBody] UpdateDocumentPermissionRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            // Validar DocumentRole
            if (request.Role != (int)DocumentRole.Viewer && request.Role != (int)DocumentRole.Editor)
            {
                return BadRequest(new
                {
                    message = "Invalid role.",
                    errors = new[] { "Document role must be Viewer (0) or Editor (1)." }
                });
            }

            var permission = await _context.DocumentPermission
                .Include(dp => dp.TeamMember)
                .Include(dp => dp.Document)
                .FirstOrDefaultAsync(dp => dp.Id == id);

            if (permission == null)
                return NotFound(new { message = "Permission not found." });

            // Verificar que o caller é Owner ou TeamAdmin da equipa
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == permission.Document.TeamId && m.UserId == userId);

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
                    errors = new[] { "Only Owner or Team Admin can manage document permissions." }
                });
            }

            if (callerMember.Role == TeamRole.TeamAdmin &&
                (permission.TeamMember.Role == TeamRole.Owner || permission.TeamMember.Role == TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "A Team Admin cannot modify permissions of an Owner or another Team Admin." }
                });
            }

            // Não é possível alterar a role de um TeamAdmin (sempre Editor)
            if (permission.TeamMember.Role == TeamRole.TeamAdmin)
            {
                return BadRequest(new
                {
                    message = "Invalid operation.",
                    errors = new[] { "Team Admin document role cannot be changed. They are always Editor." }
                });
            }

            permission.Role = (DocumentRole)request.Role;
            permission.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Remove uma permissão de documento (retira acesso ao membro).
        /// Requer Owner ou TeamAdmin. Não pode remover Owner/TeamAdmin.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePermission(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var permission = await _context.DocumentPermission
                .Include(dp => dp.TeamMember)
                .Include(dp => dp.Document)
                .FirstOrDefaultAsync(dp => dp.Id == id);

            if (permission == null)
                return NotFound(new { message = "Permission not found." });

            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == permission.Document.TeamId && m.UserId == userId);

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
                    errors = new[] { "Only Owner or Team Admin can manage document permissions." }
                });
            }

            if (callerMember.Role == TeamRole.TeamAdmin &&
                (permission.TeamMember.Role == TeamRole.Owner || permission.TeamMember.Role == TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "A Team Admin cannot remove permissions of an Owner or another Team Admin." }
                });
            }

            _context.DocumentPermission.Remove(permission);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
