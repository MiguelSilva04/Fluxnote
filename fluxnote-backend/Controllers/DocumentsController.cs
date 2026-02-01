using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Documents;
using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Fluxnote.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class DocumentsController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;
        private readonly UserManager<User> _userManager;

        // Limite de documentos para o plano Free
        private const int FreeDocumentLimit = 10;

        public DocumentsController(FluxnoteServerContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // GET: api/Documents
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DocumentDto>>> GetDocuments([FromQuery] int? teamId, [FromQuery] string? search)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            // Obter IDs das equipas onde o utilizador é membro
            var userTeamIds = await _context.TeamMember
                .Where(m => m.UserId == userId)
                .Select(m => m.TeamId)
                .ToListAsync();

            // Query base: documentos das equipas do utilizador, não eliminados
            var query = _context.Document
                .Include(d => d.Team)
                .Include(d => d.CreatedBy)
                .Where(d => userTeamIds.Contains(d.TeamId) && !d.IsDeleted);

            // Filtro por equipa
            if (teamId.HasValue)
            {
                query = query.Where(d => d.TeamId == teamId.Value);
            }

            // Filtro por pesquisa (título ou plainText)
            string? searchLower = null;
            if (!string.IsNullOrWhiteSpace(search))
            {
                searchLower = search.ToLower();
                query = query.Where(d =>
                    d.Title.ToLower().Contains(searchLower) ||
                    (d.PlainText != null && d.PlainText.ToLower().Contains(searchLower)));
            }

            // Ordenar por última atualização (mais recentes primeiro)
            var rawDocuments = await query
                .OrderByDescending(d => d.UpdatedAt)
                .Select(d => new 
                {
                    d.Id,
                    d.Title,
                    d.TeamId,
                    TeamName = d.Team.Name,
                    d.CreatedById,
                    CreatedByName = d.CreatedBy.FullName ?? d.CreatedBy.Email ?? "",
                    d.CreatedAt,
                    d.UpdatedAt,
                    d.IsDeleted,
                    d.PlainText
                })
                .ToListAsync();

            // Criar DTOs com preview se houver pesquisa
            var documents = rawDocuments.Select(d => new DocumentDto
            {
                Id = d.Id,
                Title = d.Title,
                TeamId = d.TeamId,
                TeamName = d.TeamName,
                CreatedById = d.CreatedById,
                CreatedByName = d.CreatedByName,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt,
                IsDeleted = d.IsDeleted,
                Preview = searchLower != null ? GeneratePreview(d.PlainText, d.Title, searchLower) : null
            }).ToList();

            return Ok(documents);
        }

        /// <summary>
        /// Gera uma preview do texto com a query de pesquisa destacada
        /// </summary>
        private static string? GeneratePreview(string? plainText, string? title, string searchQuery, int contextLength = 60)
        {
            // Se encontrou no PlainText, mostrar preview do PlainText
            if (!string.IsNullOrEmpty(plainText))
            {
                var lowerText = plainText.ToLower();
                var index = lowerText.IndexOf(searchQuery);
                
                if (index != -1)
                {
                    // Calcular início e fim da preview
                    var start = Math.Max(0, index - contextLength);
                    var end = Math.Min(plainText.Length, index + searchQuery.Length + contextLength);

                    var preview = plainText.Substring(start, end - start);

                    // Adicionar reticências se necessário
                    if (start > 0) preview = "..." + preview;
                    if (end < plainText.Length) preview = preview + "...";

                    return preview;
                }
                
                // Se não encontrou a query no plainText mas tem plainText, mostrar início do documento
                var previewLength = Math.Min(plainText.Length, 120);
                var startPreview = plainText.Substring(0, previewLength);
                return previewLength < plainText.Length ? startPreview + "..." : startPreview;
            }

            return null;
        }

        // POST: api/Documents
        [HttpPost]
        public async Task<ActionResult<DocumentDto>> CreateDocument([FromBody] CreateDocumentRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
                return Unauthorized(new { message = "User not found." });

            // Validar limite de documentos (Free = 10)
            var userDocumentCount = await _context.Document
                .CountAsync(d => d.CreatedById == userId && !d.IsDeleted);

            if (userDocumentCount >= FreeDocumentLimit)
            {
                return BadRequest(new
                {
                    message = "Document limit reached.",
                    errors = new[] { $"Free plan allows up to {FreeDocumentLimit} documents." }
                });
            }

            Team team;

            if (request.TeamId.HasValue)
            {
                // Verificar se a equipa existe e se o utilizador é Owner
                var existingTeam = await _context.Team
                    .Include(t => t.Members)
                    .FirstOrDefaultAsync(t => t.Id == request.TeamId.Value);

                if (existingTeam is null)
                {
                    return NotFound(new { message = "Team not found." });
                }

                // Verificar se o utilizador é Owner da equipa
                var isOwner = existingTeam.Members
                    .Any(m => m.UserId == userId && m.Role == TeamRole.Owner);

                if (!isOwner)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = "Permission denied.",
                        errors = new[] { "Only the team Owner can create documents." }
                    });
                }

                team = existingTeam;
            }
            else
            {
                // Validar que o nome da equipa foi fornecido
                if (string.IsNullOrWhiteSpace(request.TeamName))
                {
                    return BadRequest(new
                    {
                        message = "Team name is mandatory.",
                        errors = new[] { "If you don't specify an existing team, you must provide a name for the new team." }
                    });
                }

                // Criar nova equipa com o nome fornecido
                team = new Team
                {
                    Name = request.TeamName.Trim(),
                    OwnerId = 0, // Será atualizado após criar o TeamMember
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.Team.Add(team);
                await _context.SaveChangesAsync();

                // Criar o TeamMember como Owner
                var teamMember = new TeamMember
                {
                    Name = user.FullName ?? user.Email ?? "Owner",
                    UserId = userId,
                    TeamId = team.Id,
                    Role = TeamRole.Owner,
                    JoinedAt = DateTime.UtcNow
                };

                _context.TeamMember.Add(teamMember);
                await _context.SaveChangesAsync();

                // Atualizar o OwnerId da equipa
                team.OwnerId = teamMember.Id;
                await _context.SaveChangesAsync();
            }

            // Criar o documento
            var now = DateTime.UtcNow;
            var document = new Document
            {
                Title = request.Title,
                TeamId = team.Id,
                Content = null, // Y.Doc vazio - será inicializado no frontend
                PlainText = null,
                CreatedAt = now,
                UpdatedAt = now,
                CreatedById = userId,
                IsDeleted = false
            };

            _context.Document.Add(document);
            await _context.SaveChangesAsync();

            // Retornar o DTO
            var dto = new DocumentDto
            {
                Id = document.Id,
                Title = document.Title,
                TeamId = document.TeamId,
                TeamName = team.Name,
                CreatedById = document.CreatedById,
                CreatedByName = user.FullName ?? user.Email ?? "",
                CreatedAt = document.CreatedAt,
                UpdatedAt = document.UpdatedAt,
                IsDeleted = document.IsDeleted
            };

            return CreatedAtAction(nameof(GetDocument), new { id = document.Id }, dto);
        }

        // GET: api/Documents/5
        [HttpGet("{id}")]
        public async Task<ActionResult<DocumentDetailDto>> GetDocument(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .Include(d => d.Team)
                .Include(d => d.CreatedBy)
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (document is null)
            {
                return NotFound(new { message = "Document not found." });
            }

            // Verificar se o utilizador tem acesso (é membro da equipa)
            var isMember = await _context.TeamMember
                .AnyAsync(m => m.TeamId == document.TeamId && m.UserId == userId);

            if (!isMember)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You don't have access to this document." }
                });
            }

            var dto = new DocumentDetailDto
            {
                Id = document.Id,
                Title = document.Title,
                TeamId = document.TeamId,
                TeamName = document.Team.Name,
                CreatedById = document.CreatedById,
                CreatedByName = document.CreatedBy.FullName ?? document.CreatedBy.Email ?? "",
                CreatedAt = document.CreatedAt,
                UpdatedAt = document.UpdatedAt,
                IsDeleted = document.IsDeleted,
                Content = document.Content != null ? System.Text.Encoding.UTF8.GetString(document.Content) : null,
                PlainText = document.PlainText
            };

            return Ok(dto);
        }

        // PUT: api/Documents/5
        [HttpPut("{id}")]
        public async Task<ActionResult<DocumentDetailDto>> UpdateDocument(int id, [FromBody] UpdateDocumentRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .Include(d => d.Team)
                .Include(d => d.CreatedBy)
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (document is null)
            {
                return NotFound(new { message = "Document not found." });
            }

            // Verificar se o utilizador tem acesso (é membro da equipa)
            var isMember = await _context.TeamMember
                .AnyAsync(m => m.TeamId == document.TeamId && m.UserId == userId);

            if (!isMember)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You don't have access to this document." }
                });
            }

            // Atualizar título se fornecido
            if (!string.IsNullOrWhiteSpace(request.Title))
            {
                document.Title = request.Title.Trim();
            }

            // Atualizar conteúdo se fornecido
            if (request.Content != null)
            {
                // Guardar conteúdo HTML como bytes UTF-8
                document.Content = System.Text.Encoding.UTF8.GetBytes(request.Content);
                
                // Extrair texto limpo para pesquisa (remover tags HTML)
                document.PlainText = StripHtmlTags(request.Content);
            }

            document.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var dto = new DocumentDetailDto
            {
                Id = document.Id,
                Title = document.Title,
                TeamId = document.TeamId,
                TeamName = document.Team.Name,
                CreatedById = document.CreatedById,
                CreatedByName = document.CreatedBy.FullName ?? document.CreatedBy.Email ?? "",
                CreatedAt = document.CreatedAt,
                UpdatedAt = document.UpdatedAt,
                IsDeleted = document.IsDeleted,
                Content = document.Content != null ? System.Text.Encoding.UTF8.GetString(document.Content) : null,
                PlainText = document.PlainText
            };

            return Ok(dto);
        }

        // DELETE: api/Documents/5
        /// <summary>
        /// Move um documento para a lixeira (soft delete). Apenas o criador pode apagar.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDocument(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (document is null)
            {
                return NotFound(new { message = "Document not found." });
            }

            // Verificar se o utilizador é o criador do documento
            if (document.CreatedById != userId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the document creator can delete it." }
                });
            }

            // Soft delete
            document.IsDeleted = true;
            document.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/Documents/trash
        /// <summary>
        /// Lista documentos na lixeira do utilizador (apenas documentos criados pelo próprio).
        /// </summary>
        [HttpGet("trash")]
        public async Task<ActionResult<IEnumerable<DocumentDto>>> GetTrash()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var documents = await _context.Document
                .Include(d => d.Team)
                .Include(d => d.CreatedBy)
                .Where(d => d.CreatedById == userId && d.IsDeleted)
                .OrderByDescending(d => d.UpdatedAt)
                .Select(d => new DocumentDto
                {
                    Id = d.Id,
                    Title = d.Title,
                    TeamId = d.TeamId,
                    TeamName = d.Team.Name,
                    CreatedById = d.CreatedById,
                    CreatedByName = d.CreatedBy.FullName ?? d.CreatedBy.Email ?? "",
                    CreatedAt = d.CreatedAt,
                    UpdatedAt = d.UpdatedAt,
                    IsDeleted = d.IsDeleted
                })
                .ToListAsync();

            return Ok(documents);
        }

        // POST: api/Documents/5/restore
        /// <summary>
        /// Restaura um documento da lixeira. Apenas o criador pode restaurar.
        /// </summary>
        [HttpPost("{id}/restore")]
        public async Task<IActionResult> RestoreDocument(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .FirstOrDefaultAsync(d => d.Id == id && d.IsDeleted);

            if (document is null)
            {
                return NotFound(new { message = "Document not found in trash." });
            }

            // Verificar se o utilizador é o criador do documento
            if (document.CreatedById != userId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the document creator can restore it." }
                });
            }

            // Restaurar
            document.IsDeleted = false;
            document.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/Documents/5/permanent
        /// <summary>
        /// Elimina permanentemente um documento da lixeira. Apenas o criador pode eliminar.
        /// </summary>
        [HttpDelete("{id}/permanent")]
        public async Task<IActionResult> PermanentDeleteDocument(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .FirstOrDefaultAsync(d => d.Id == id && d.IsDeleted);

            if (document is null)
            {
                return NotFound(new { message = "Document not found in trash." });
            }

            // Verificar se o utilizador é o criador do documento
            if (document.CreatedById != userId)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the document creator can permanently delete it." }
                });
            }

            // Eliminar permanentemente
            _context.Document.Remove(document);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Remove tags HTML do conteúdo para obter texto limpo para pesquisa
        /// </summary>
        private static string StripHtmlTags(string html)
        {
            if (string.IsNullOrEmpty(html))
                return string.Empty;

            // Regex simples para remover tags HTML
            var text = System.Text.RegularExpressions.Regex.Replace(html, "<[^>]*>", " ");
            // Decodificar entidades HTML comuns
            text = System.Net.WebUtility.HtmlDecode(text);
            // Normalizar espaços
            text = System.Text.RegularExpressions.Regex.Replace(text, @"\s+", " ").Trim();
            return text;
        }
    }
}
