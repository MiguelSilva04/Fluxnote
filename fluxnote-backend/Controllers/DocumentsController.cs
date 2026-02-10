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
    /// <summary>
    /// Controlador responsável pela gestão de documentos colaborativos.
    /// Suporta CRUD completo, pesquisa, lixeira e recuperação de documentos.
    /// </summary>
    /// <remarks>
    /// <b>Rota Base:</b> api/documents<br/>
    /// <b>Autenticação:</b> JWT Bearer obrigatório em todos os endpoints.
    ///
    /// <b>Endpoints Disponíveis:</b>
    /// <list type="table">
    ///     <listheader>
    ///         <term>Método</term>
    ///         <description>Rota e Descrição</description>
    ///     </listheader>
    ///     <item><term>GET</term><description>/ - Listar documentos (com filtros opcionais)</description></item>
    ///     <item><term>GET</term><description>/{id} - Obter detalhes de um documento</description></item>
    ///     <item><term>POST</term><description>/ - Criar novo documento</description></item>
    ///     <item><term>PUT</term><description>/{id} - Atualizar documento</description></item>
    ///     <item><term>DELETE</term><description>/{id} - Mover para lixeira (soft delete)</description></item>
    ///     <item><term>GET</term><description>/trash - Listar documentos na lixeira</description></item>
    ///     <item><term>POST</term><description>/{id}/restore - Restaurar da lixeira</description></item>
    ///     <item><term>DELETE</term><description>/{id}/permanent - Eliminar permanentemente</description></item>
    /// </list>
    ///
    /// <b>Regras de Negócio:</b>
    /// <list type="bullet">
    ///     <item><description>Limite de 10 documentos por utilizador (plano Free)</description></item>
    ///     <item><description>Apenas membros da equipa podem ver/editar documentos</description></item>
    ///     <item><description>Apenas o Owner da equipa pode criar documentos</description></item>
    ///     <item><description>Apenas o criador pode mover para lixeira, restaurar ou eliminar permanentemente</description></item>
    ///     <item><description>Pesquisa funciona em título e texto plano extraído do HTML</description></item>
    /// </list>
    ///
    /// <b>Armazenamento de Conteúdo:</b><br/>
    /// O conteúdo HTML é convertido para bytes UTF-8 e armazenado como varbinary.<br/>
    /// O texto plano é extraído automaticamente para funcionalidade de pesquisa.
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class DocumentsController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;
        private readonly UserManager<User> _userManager;

        /// <summary>
        /// Limite de documentos para o plano Free.
        /// </summary>
        private const int FreeDocumentLimit = 10;

        /// <summary>
        /// Construtor com injeção de dependências.
        /// </summary>
        /// <param name="context">Contexto da base de dados.</param>
        /// <param name="userManager">Gestor de utilizadores do Identity.</param>
        public DocumentsController(FluxnoteServerContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        /// <summary>
        /// Lista os documentos acessíveis pelo utilizador autenticado.
        /// </summary>
        /// <param name="teamId">Filtrar por ID de equipa (opcional).</param>
        /// <param name="search">Termo de pesquisa em título e conteúdo (opcional).</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>200 OK:</b> Lista de DocumentDto ordenada por UpdatedAt (desc).</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>Filtros:</b>
        /// <list type="bullet">
        ///     <item><description><b>teamId:</b> Retorna apenas documentos dessa equipa</description></item>
        ///     <item><description><b>search:</b> Pesquisa case-insensitive em título e PlainText</description></item>
        /// </list>
        /// <b>Preview:</b> Quando há pesquisa, inclui preview com contexto em torno do match.<br/>
        /// <b>Acesso:</b> Apenas documentos de equipas onde o utilizador é membro.
        /// </remarks>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DocumentDto>>> GetDocuments([FromQuery] int? teamId, [FromQuery] string? search)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            // Obter IDs das equipas onde o utilizador é membro
            var userTeamMembers = await _context.TeamMember
                .Where(m => m.UserId == userId)
                .ToListAsync();

            if(!userTeamMembers.Any())
            {
                // O utilizador não é membro de nenhuma equipa
                return Ok(new List<DocumentDto>());
            }

            var userTeamIds = userTeamMembers.Select(m => m.TeamId).ToList();
            var adminOrOwnerTeamIds = userTeamMembers
                .Where(m => m.Role == TeamRole.Owner || m.Role == TeamRole.TeamAdmin)
                .Select(m => m.TeamId)
                .ToList();

            // Query base: documentos das equipas do utilizador, não eliminados
            // Futuramente: Buscar apenas documentos em que exista um registo DocumentPermission com o TeamMemberID e DocumentID exceto se for Owner ou TeamAdmin
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

            var allDocuments = await query
                .OrderByDescending(d => d.UpdatedAt)
                .ToListAsync();

            // Filtrar por DocumentPermission (exceto Owners/TeamAdmins)
            var accessibleDocuments = new List<Document>();

            foreach (var doc in allDocuments)
            {
                var userTeamMember = userTeamMembers.FirstOrDefault(m => m.TeamId == doc.TeamId);

                if (userTeamMember == null)
                    continue;

                // Owners e TeamAdmins veem todos os documentos da equipa
                if (adminOrOwnerTeamIds.Contains(doc.TeamId))
                {
                    accessibleDocuments.Add(doc);
                }
                else
                {
                    // Verificar se existe DocumentPermission para este TeamMember e Document
                    var hasPermission = await _context.DocumentPermission
                        .AnyAsync(dp => dp.TeamMemberId == userTeamMember.Id && dp.DocumentId == doc.Id);

                    if (hasPermission)
                    {
                        accessibleDocuments.Add(doc);
                    }
                }
            }

            // Criar DTOs
            var documents = accessibleDocuments.Select(d =>
            {
                var team = d.Team;
                var createdBy = d.CreatedBy;
                return new DocumentDto
                {
                    Id = d.Id,
                    Title = d.Title,
                    TeamId = d.TeamId,
                    TeamName = team.Name,
                    CreatedById = d.CreatedById,
                    CreatedByName = createdBy.FullName ?? createdBy.Email ?? "",
                    CreatedAt = d.CreatedAt,
                    UpdatedAt = d.UpdatedAt,
                    IsDeleted = d.IsDeleted,
                    Preview = searchLower != null ? GeneratePreview(d.PlainText, d.Title, searchLower) : null
                };
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

        /// <summary>
        /// Cria um novo documento numa equipa.
        /// </summary>
        /// <param name="request">Dados do documento: Title, TeamId (opcional), TeamName (opcional).</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>201 Created:</b> Documento criado com sucesso (DocumentDto).</item>
        ///     <item><b>400 Bad Request:</b> Limite de documentos atingido ou nome de equipa em falta.</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        ///     <item><b>403 Forbidden:</b> Utilizador não é Owner da equipa.</item>
        ///     <item><b>404 Not Found:</b> Equipa especificada não existe.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>Comportamento:</b>
        /// <list type="bullet">
        ///     <item><description>Se TeamId especificado: adiciona à equipa existente (requer ser Owner)</description></item>
        ///     <item><description>Se apenas TeamName: cria nova equipa com o utilizador como Owner</description></item>
        /// </list>
        /// <b>Limite:</b> Máximo 10 documentos por utilizador (plano Free).<br/>
        /// <b>Permissão:</b> Apenas o Owner da equipa pode criar documentos.
        /// </remarks>
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
            TeamMember? ownerTeamMember = null;

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
                ownerTeamMember = existingTeam.Members
                    .FirstOrDefault(m => m.UserId == userId && m.Role == TeamRole.Owner);

                if (ownerTeamMember == null)
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

                ownerTeamMember = teamMember;
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

            // Criar DocumentPermission para o Owner (que criou o documento)
            // Nota: O Owner já tem acesso total, mas cria se a permissão para consistência
            if (ownerTeamMember != null)
            {
                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = ownerTeamMember.Id,
                    DocumentId = document.Id,
                    Role = DocumentRole.Editor,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.DocumentPermission.Add(documentPermission);
                await _context.SaveChangesAsync();
            }

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

        /// <summary>
        /// Obtém os detalhes completos de um documento, incluindo conteúdo.
        /// </summary>
        /// <param name="id">ID do documento.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>200 OK:</b> Detalhes do documento (DocumentDetailDto com Content e PlainText).</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        ///     <item><b>403 Forbidden:</b> Utilizador não é membro da equipa.</item>
        ///     <item><b>404 Not Found:</b> Documento não encontrado ou na lixeira.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>Conteúdo:</b> O campo Content contém o HTML armazenado (convertido de bytes UTF-8).<br/>
        /// <b>Acesso:</b> Requer que o utilizador seja membro da equipa do documento.
        /// </remarks>
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

            // Obter TeamMember do utilizador nesta equipa
            var userTeamMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == document.TeamId && m.UserId == userId);

            if (userTeamMember == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You are not a member of this team." }
                });
            }

            // Verificar se é Owner ou TeamAdmin (têm acesso total)
            bool hasAccess = userTeamMember.Role == TeamRole.Owner || userTeamMember.Role == TeamRole.TeamAdmin;

            // Se não for Owner/Admin, verificar DocumentPermission
            if (!hasAccess)
            {
                hasAccess = await _context.DocumentPermission
                    .AnyAsync(dp => dp.TeamMemberId == userTeamMember.Id && dp.DocumentId == document.Id);
            }

            if (!hasAccess)
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

        /// <summary>
        /// Atualiza o título e/ou conteúdo de um documento.
        /// </summary>
        /// <param name="id">ID do documento.</param>
        /// <param name="request">Campos a atualizar: Title (opcional), Content (opcional).</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>200 OK:</b> Documento atualizado (DocumentDetailDto).</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        ///     <item><b>403 Forbidden:</b> Utilizador não é membro da equipa.</item>
        ///     <item><b>404 Not Found:</b> Documento não encontrado ou na lixeira.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>Processamento de Conteúdo:</b>
        /// <list type="bullet">
        ///     <item><description>Content HTML é convertido para bytes UTF-8</description></item>
        ///     <item><description>PlainText é extraído automaticamente (tags HTML removidas)</description></item>
        ///     <item><description>UpdatedAt é atualizado para a hora atual</description></item>
        /// </list>
        /// <b>Acesso:</b> Requer que o utilizador seja membro da equipa.
        /// </remarks>
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

            // Obter TeamMember do utilizador nesta equipa
            var userTeamMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == document.TeamId && m.UserId == userId);

            if (userTeamMember == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You are not a member of this team." }
                });
            }

            // Verificar se é Owner ou TeamAdmin (podem editar)
            bool canEdit = userTeamMember.Role == TeamRole.Owner || userTeamMember.Role == TeamRole.TeamAdmin;

            // Se não for Owner/Admin, verificar se tem DocumentPermission com Role = Editor
            if (!canEdit)
            {
                var permission = await _context.DocumentPermission
                    .FirstOrDefaultAsync(dp => dp.TeamMemberId == userTeamMember.Id && dp.DocumentId == document.Id);

                canEdit = permission != null && permission.Role == DocumentRole.Editor;
            }

            if (!canEdit)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You don't have permission to edit this document." }
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
        /// Move um documento para a lixeira (soft delete). Apenas o Owner da equipa pode apagar.
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

            // Verificar se o utilizador é Owner da equipa do documento
            var userTeamMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == document.TeamId && m.UserId == userId);

            if (userTeamMember == null || userTeamMember.Role != TeamRole.Owner)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the team Owner can delete documents." }
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
