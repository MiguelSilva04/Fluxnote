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
                return Unauthorized(new { message = "Utilizador não autenticado." });

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
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(d =>
                    d.Title.ToLower().Contains(searchLower) ||
                    (d.PlainText != null && d.PlainText.ToLower().Contains(searchLower)));
            }

            // Ordenar por última atualização (mais recentes primeiro)
            var documents = await query
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

        // POST: api/Documents
        [HttpPost]
        public async Task<ActionResult<DocumentDto>> CreateDocument([FromBody] CreateDocumentRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "Utilizador não autenticado." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
                return Unauthorized(new { message = "Utilizador não encontrado." });

            // Validar limite de documentos (Free = 10)
            var userDocumentCount = await _context.Document
                .CountAsync(d => d.CreatedById == userId && !d.IsDeleted);

            if (userDocumentCount >= FreeDocumentLimit)
            {
                return BadRequest(new
                {
                    message = "Limite de documentos atingido.",
                    errors = new[] { $"O plano Free permite no máximo {FreeDocumentLimit} documentos." }
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
                    return NotFound(new { message = "Equipa não encontrada." });
                }

                // Verificar se o utilizador é Owner da equipa
                var isOwner = existingTeam.Members
                    .Any(m => m.UserId == userId && m.Role == TeamRole.Owner);

                if (!isOwner)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = "Sem permissão.",
                        errors = new[] { "Apenas o Owner da equipa pode criar documentos." }
                    });
                }

                team = existingTeam;
            }
            else
            {
                // Criar equipa automática para o utilizador
                team = new Team
                {
                    Name = $"Equipa de {user.FullName ?? user.Email}",
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
                return Unauthorized(new { message = "Utilizador não autenticado." });

            var document = await _context.Document
                .Include(d => d.Team)
                .Include(d => d.CreatedBy)
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (document is null)
            {
                return NotFound(new { message = "Documento não encontrado." });
            }

            // Verificar se o utilizador tem acesso (é membro da equipa)
            var isMember = await _context.TeamMember
                .AnyAsync(m => m.TeamId == document.TeamId && m.UserId == userId);

            if (!isMember)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Sem permissão.",
                    errors = new[] { "Não tens acesso a este documento." }
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
                Content = document.Content != null ? Convert.ToBase64String(document.Content) : null,
                PlainText = document.PlainText
            };

            return Ok(dto);
        }
    }
}
