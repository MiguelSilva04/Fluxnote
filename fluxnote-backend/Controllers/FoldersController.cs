using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Folders;
using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Fluxnote.Backend.Controllers
{
    /// <summary>
    /// Controlador responsável pela organização de documentos em pastas por equipa.
    /// </summary>
    /// <remarks>
    /// <b>Rota Base:</b> api/folders<br/>
    /// <b>Autenticação:</b> JWT Bearer obrigatório.<br/>
    /// Suporta listagem, criação, edição, remoção de pastas e movimentação de documentos.
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class FoldersController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;

        public FoldersController(FluxnoteServerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lista as pastas de uma equipa.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FolderDto>>> GetFolders([FromQuery] int teamId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            // Verificar se o utilizador é membro da equipa
            var membership = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == teamId && m.UserId == userId);

            if (membership == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You are not a member of this team." }
                });
            }

            var folders = await _context.Folder
                .Where(f => f.TeamId == teamId)
                .Select(f => new FolderDto
                {
                    Id = f.Id,
                    Name = f.Name,
                    TeamId = f.TeamId,
                    CreatedAt = f.CreatedAt,
                    UpdatedAt = f.UpdatedAt,
                    DocumentCount = f.Documents.Count(d => !d.IsDeleted)
                })
                .OrderBy(f => f.Name)
                .ToListAsync();

            return Ok(folders);
        }

        /// <summary>
        /// Cria uma nova pasta numa equipa. Apenas Owner ou TeamAdmin.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<FolderDto>> CreateFolder([FromBody] CreateFolderRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Verificar permissão (Owner ou TeamAdmin)
            var membership = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == request.TeamId && m.UserId == userId);

            if (membership == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You are not a member of this team." }
                });
            }

            if (membership.Role != TeamRole.Owner && membership.Role != TeamRole.TeamAdmin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the team Owner or Admin can create folders." }
                });
            }

            var folder = new Folder
            {
                Name = request.Name.Trim(),
                TeamId = request.TeamId,
                CreatedById = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Folder.Add(folder);
            await _context.SaveChangesAsync();

            var dto = new FolderDto
            {
                Id = folder.Id,
                Name = folder.Name,
                TeamId = folder.TeamId,
                CreatedAt = folder.CreatedAt,
                UpdatedAt = folder.UpdatedAt,
                DocumentCount = 0
            };

            return CreatedAtAction(nameof(GetFolders), new { teamId = folder.TeamId }, dto);
        }

        /// <summary>
        /// Renomeia uma pasta. Apenas Owner ou TeamAdmin.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateFolder(int id, [FromBody] UpdateFolderRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var folder = await _context.Folder.FirstOrDefaultAsync(f => f.Id == id);
            if (folder == null)
                return NotFound(new { message = "Folder not found." });

            // Verificar permissão
            var membership = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == folder.TeamId && m.UserId == userId);

            if (membership == null || (membership.Role != TeamRole.Owner && membership.Role != TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the team Owner or Admin can rename folders." }
                });
            }

            folder.Name = request.Name.Trim();
            folder.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Elimina uma pasta. Documentos ficam soltos (FolderId = null). Apenas Owner ou TeamAdmin.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFolder(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var folder = await _context.Folder
                .Include(f => f.Documents)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (folder == null)
                return NotFound(new { message = "Folder not found." });

            // Verificar permissão
            var membership = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == folder.TeamId && m.UserId == userId);

            if (membership == null || (membership.Role != TeamRole.Owner && membership.Role != TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the team Owner or Admin can delete folders." }
                });
            }

            // Remover FolderId dos documentos manualmente (NoAction no DB para evitar ciclos de cascade)
            foreach (var doc in folder.Documents)
            {
                doc.FolderId = null;
            }

            _context.Folder.Remove(folder);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Move um documento para uma pasta. Apenas Owner ou TeamAdmin.
        /// </summary>
        [HttpPut("{id}/documents/{docId}")]
        public async Task<IActionResult> MoveDocumentToFolder(int id, int docId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var folder = await _context.Folder.FirstOrDefaultAsync(f => f.Id == id);
            if (folder == null)
                return NotFound(new { message = "Folder not found." });

            var document = await _context.Document.FirstOrDefaultAsync(d => d.Id == docId && !d.IsDeleted);
            if (document == null)
                return NotFound(new { message = "Document not found." });

            // Verificar que documento e pasta pertencem à mesma equipa
            if (document.TeamId != folder.TeamId)
            {
                return BadRequest(new { message = "Document and folder must belong to the same team." });
            }

            // Verificar permissão
            var membership = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == folder.TeamId && m.UserId == userId);

            if (membership == null || (membership.Role != TeamRole.Owner && membership.Role != TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the team Owner or Admin can move documents to folders." }
                });
            }

            document.FolderId = folder.Id;
            document.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Remove um documento de uma pasta (fica solto). Apenas Owner ou TeamAdmin.
        /// </summary>
        [HttpDelete("{id}/documents/{docId}")]
        public async Task<IActionResult> RemoveDocumentFromFolder(int id, int docId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var folder = await _context.Folder.FirstOrDefaultAsync(f => f.Id == id);
            if (folder == null)
                return NotFound(new { message = "Folder not found." });

            var document = await _context.Document
                .FirstOrDefaultAsync(d => d.Id == docId && d.FolderId == id && !d.IsDeleted);

            if (document == null)
                return NotFound(new { message = "Document not found in this folder." });

            // Verificar permissão
            var membership = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == folder.TeamId && m.UserId == userId);

            if (membership == null || (membership.Role != TeamRole.Owner && membership.Role != TeamRole.TeamAdmin))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the team Owner or Admin can remove documents from folders." }
                });
            }

            document.FolderId = null;
            document.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
