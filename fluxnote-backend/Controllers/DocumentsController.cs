using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Documents;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Services.AI;
using Fluxnote.Backend.Services.Storage;
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
        private readonly IAIService _aiService;
        private readonly IStorageService _storageService;
        private readonly ITextExtractionService _textExtractionService;

        /// <summary>
        /// Limite de documentos para o plano Free.
        /// </summary>
        private const int FreeDocumentLimit = 10;

        /// <summary>
        /// Construtor com injeção de dependências.
        /// </summary>
        /// <param name="context">Contexto da base de dados.</param>
        /// <param name="userManager">Gestor de utilizadores do Identity.</param>
        /// <param name="aiService">Serviço de IA generativa.</param>
        /// <param name="storageService">Serviço de armazenamento de ficheiros.</param>
        /// <param name="textExtractionService">Serviço de extração de texto para ficheiros de contexto.</param>
        public DocumentsController(
            FluxnoteServerContext context,
            UserManager<User> userManager,
            IAIService aiService,
            IStorageService storageService,
            ITextExtractionService textExtractionService)
        {
            _context = context;
            _userManager = userManager;
            _aiService = aiService;
            _storageService = storageService;
            _textExtractionService = textExtractionService;
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
            var ownerTeamIds = userTeamMembers
                .Where(m => m.Role == TeamRole.Owner)
                .Select(m => m.TeamId)
                .ToList();

            // Query base: documentos das equipas do utilizador, não eliminados
            // Owner faz bypass às verificações de DocumentPermission, apesar de ser criado um DocumentPermission para consistência, o acesso é garantido pelo TeamRole
            var query = _context.Document
                .Include(d => d.Team)
                .Include(d => d.CreatedBy)
                .Include(d => d.Folder)
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

                // Owners ve todos os documentos da equipa
                if (ownerTeamIds.Contains(doc.TeamId))
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
                    FolderId = d.FolderId,
                    FolderName = d.Folder?.Name,
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
        /// Duplica um documento existente.
        /// </summary>
        /// <param name="id">ID do documento a duplicar.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>201 Created:</b> Documento duplicado com sucesso (DocumentDto).</item>
        ///     <item><b>400 Bad Request:</b> Limite de documentos atingido.</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        ///     <item><b>403 Forbidden:</b> Utilizador não é Owner da equipa.</item>
        ///     <item><b>404 Not Found:</b> Documento não encontrado.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>Comportamento:</b>
        /// <list type="bullet">
        ///     <item><description>Cria cópia do documento com título "[Original] (Copy)"</description></item>
        ///     <item><description>Copia conteúdo e plainText</description></item>
        ///     <item><description>NÃO copia DocumentPermissions (cópia limpa)</description></item>
        ///     <item><description>Cria DocumentPermission apenas para o Owner</description></item>
        /// </list>
        /// <b>Permissão:</b> Apenas o Owner da equipa pode duplicar documentos.
        /// </remarks>
        [HttpPost("{id}/duplicate")]
        public async Task<ActionResult<DocumentDto>> DuplicateDocument(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
                return Unauthorized(new { message = "User not found." });

            // Obter o documento original
            var originalDocument = await _context.Document
                .Include(d => d.Team)
                    .ThenInclude(t => t.Members)
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (originalDocument is null)
            {
                return NotFound(new { message = "Document not found." });
            }

            // Verificar se o utilizador é Owner da equipa
            var ownerTeamMember = originalDocument.Team.Members
                .FirstOrDefault(m => m.UserId == userId && m.Role == TeamRole.Owner);

            if (ownerTeamMember == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the team Owner can duplicate documents." }
                });
            }

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

            var now = DateTime.UtcNow;
            var duplicatedDocument = new Document
            {
                Title = $"{originalDocument.Title} (Copy)",
                TeamId = originalDocument.TeamId,
                Content = originalDocument.Content,
                PlainText = originalDocument.PlainText,
                CreatedAt = now,
                UpdatedAt = now,
                CreatedById = userId,
                IsDeleted = false
            };

            _context.Document.Add(duplicatedDocument);
            await _context.SaveChangesAsync();

            // Criar DocumentPermission apenas para o Owner
            var documentPermission = new DocumentPermission
            {
                TeamMemberId = ownerTeamMember.Id,
                DocumentId = duplicatedDocument.Id,
                Role = DocumentRole.Editor,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.DocumentPermission.Add(documentPermission);
            await _context.SaveChangesAsync();

            var dto = new DocumentDto
            {
                Id = duplicatedDocument.Id,
                Title = duplicatedDocument.Title,
                TeamId = duplicatedDocument.TeamId,
                TeamName = originalDocument.Team.Name,
                CreatedById = duplicatedDocument.CreatedById,
                CreatedByName = user.FullName ?? user.Email ?? "",
                CreatedAt = duplicatedDocument.CreatedAt,
                UpdatedAt = duplicatedDocument.UpdatedAt,
                IsDeleted = duplicatedDocument.IsDeleted
            };

            return CreatedAtAction(nameof(GetDocument), new { id = duplicatedDocument.Id }, dto);
        }

        /// <summary>
        /// Gera um resumo do documento usando IA (Google Gemini).
        /// </summary>
        /// <param name="id">ID do documento.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>200 OK:</b> Resumo gerado com sucesso.</item>
        ///     <item><b>400 Bad Request:</b> Documento sem conteúdo.</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        ///     <item><b>403 Forbidden:</b> Sem acesso ao documento.</item>
        ///     <item><b>404 Not Found:</b> Documento não encontrado.</item>
        ///     <item><b>500 Internal Server Error:</b> Erro no serviço de IA.</item>
        /// </list>
        /// </returns>
        [HttpPost("{id}/summary")]
        public async Task<ActionResult> GenerateSummary(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (document is null)
                return NotFound(new { message = "Document not found." });

            // Verificar que o utilizador é membro da equipa
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

            // Verificar acesso (apenas Owner faz bypass, restantes precisam DocumentPermission)
            bool isOwner = userTeamMember.Role == TeamRole.Owner;
            if (!isOwner)
            {
                var hasPermission = await _context.DocumentPermission
                    .AnyAsync(dp => dp.TeamMemberId == userTeamMember.Id && dp.DocumentId == document.Id);

                if (!hasPermission)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = "Permission denied.",
                        errors = new[] { "You don't have access to this document." }
                    });
                }
            }

            // Verificar se o documento tem conteúdo
            if (string.IsNullOrWhiteSpace(document.PlainText))
            {
                return BadRequest(new { message = "The document has no content to summarize." });
            }

            try
            {
                var summary = await _aiService.GenerateSummaryAsync(document.PlainText);
                return Ok(new { summary });
            }
            catch (InvalidOperationException ex)
            {
                // Rate limit da API Gemini
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Failed to generate summary.",
                    errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Sugere melhorias para o texto selecionado usando IA (Google Gemini).
        /// Utiliza o contexto do documento e ficheiros de contexto para maior precisão.
        /// </summary>
        /// <param name="id">ID do documento.</param>
        /// <param name="request">Texto selecionado pelo utilizador.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>200 OK:</b> Texto melhorado gerado com sucesso.</item>
        ///     <item><b>400 Bad Request:</b> Texto selecionado vazio.</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        ///     <item><b>403 Forbidden:</b> Sem acesso ao documento.</item>
        ///     <item><b>404 Not Found:</b> Documento não encontrado.</item>
        ///     <item><b>429 Too Many Requests:</b> Rate limit da API Gemini excedido.</item>
        ///     <item><b>500 Internal Server Error:</b> Erro no serviço de IA.</item>
        /// </list>
        /// </returns>
        [HttpPost("{id}/improve")]
        public async Task<ActionResult> ImproveText(int id, [FromBody] Dtos.Documents.ImproveTextRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .Include(d => d.ContextFiles)
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (document is null)
                return NotFound(new { message = "Document not found." });

            // Verificar que o utilizador é membro da equipa
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

            // Verificar acesso (Owner faz bypass, restantes precisam DocumentPermission)
            bool isOwner = userTeamMember.Role == TeamRole.Owner;
            if (!isOwner)
            {
                var hasPermission = await _context.DocumentPermission
                    .AnyAsync(dp => dp.TeamMemberId == userTeamMember.Id && dp.DocumentId == document.Id);

                if (!hasPermission)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = "Permission denied.",
                        errors = new[] { "You don't have access to this document." }
                    });
                }
            }

            try
            {
                // Recolher textos dos ficheiros de contexto
                var contextTexts = document.ContextFiles?
                    .Where(cf => !string.IsNullOrWhiteSpace(cf.ExtractedText))
                    .Select(cf => cf.ExtractedText!)
                    .ToList();

                var improvedText = await _aiService.ImproveTextAsync(
                    request.SelectedText,
                    document.PlainText ?? "",
                    contextTexts
                );

                return Ok(new { improvedText });
            }
            catch (InvalidOperationException ex)
            {
                // Rate limit da API Gemini
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Failed to generate text improvement.",
                    errors = new[] { ex.Message }
                });
            }
        }

        /// <summary>
        /// Gera conteúdo novo usando IA com base num prompt do utilizador.
        /// O conteúdo do documento e os ficheiros de contexto são incluídos para informar a geração.
        /// </summary>
        /// <param name="id">ID do documento.</param>
        /// <param name="request">Corpo com o prompt do utilizador.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>200 OK:</b> Conteúdo gerado com sucesso.</item>
        ///     <item><b>400 Bad Request:</b> Prompt vazio.</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        ///     <item><b>403 Forbidden:</b> Sem acesso ao documento.</item>
        ///     <item><b>404 Not Found:</b> Documento não encontrado.</item>
        ///     <item><b>429 Too Many Requests:</b> Rate limit da API Gemini excedido.</item>
        ///     <item><b>500 Internal Server Error:</b> Erro no serviço de IA.</item>
        /// </list>
        /// </returns>
        [HttpPost("{id}/generate")]
        public async Task<ActionResult> GenerateContent(int id, [FromBody] Dtos.Documents.GenerateContentRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .Include(d => d.ContextFiles)
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (document is null)
                return NotFound(new { message = "Document not found." });

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

            bool isOwner = userTeamMember.Role == TeamRole.Owner;
            if (!isOwner)
            {
                var hasPermission = await _context.DocumentPermission
                    .AnyAsync(dp => dp.TeamMemberId == userTeamMember.Id && dp.DocumentId == document.Id);

                if (!hasPermission)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = "Permission denied.",
                        errors = new[] { "You don't have access to this document." }
                    });
                }
            }

            try
            {
                var contextTexts = document.ContextFiles?
                    .Where(cf => !string.IsNullOrWhiteSpace(cf.ExtractedText))
                    .Select(cf => cf.ExtractedText!)
                    .ToList();

                var generatedContent = await _aiService.GenerateContentAsync(
                    request.Prompt,
                    document.PlainText ?? "",
                    contextTexts
                );

                return Ok(new { generatedContent });
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Failed to generate content.",
                    errors = new[] { ex.Message }
                });
            }
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

            // Owner faz bypass à DocumentRole (pode sempre editar)
            bool isOwner = userTeamMember.Role == TeamRole.Owner;
            bool hasAccess = isOwner;
            string effectiveRole = isOwner ? "Editor" : "Viewer";

            // Se não for Owner, verificar DocumentPermission (inclui TeamAdmins)
            if (!hasAccess)
            {
                var permission = await _context.DocumentPermission
                    .FirstOrDefaultAsync(dp => dp.TeamMemberId == userTeamMember.Id && dp.DocumentId == document.Id);

                if (permission != null)
                {
                    hasAccess = true;
                    effectiveRole = permission.Role == DocumentRole.Editor ? "Editor" : "Viewer";
                }
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
                PlainText = document.PlainText,
                Role = effectiveRole
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

            // Owner faz bypass à DocumentRole (pode sempre editar)
            bool isOwner = userTeamMember.Role == TeamRole.Owner;
            bool canEdit = isOwner;
            string effectiveRole = isOwner ? "Editor" : "Viewer";

            // Se não for Owner, verificar se tem DocumentPermission com Role = Editor (inclui TeamAdmins)
            if (!canEdit)
            {
                var permission = await _context.DocumentPermission
                    .FirstOrDefaultAsync(dp => dp.TeamMemberId == userTeamMember.Id && dp.DocumentId == document.Id);

                if (permission != null)
                {
                    effectiveRole = permission.Role == DocumentRole.Editor ? "Editor" : "Viewer";
                    canEdit = permission.Role == DocumentRole.Editor;
                }
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
                PlainText = document.PlainText,
                Role = effectiveRole
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

            // Eliminar ficheiros de contexto do storage antes de apagar o documento
            // (as linhas da BD são apagadas por cascade, mas os ficheiros no storage têm de ser removidos manualmente)
            var contextFiles = await _context.DocumentContext
                .Where(dc => dc.DocumentId == document.Id)
                .ToListAsync();

            foreach (var cf in contextFiles)
            {
                await _storageService.DeleteContextFileAsync(cf.StoredPath);
            }

            // Eliminar permanentemente
            _context.Document.Remove(document);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Faz upload de um ficheiro de contexto para o documento.
        /// O texto é extraído e guardado na BD para uso futuro pela IA.
        /// Apenas Editors e Owners podem adicionar contexto.
        /// </summary>
        /// <param name="id">ID do documento.</param>
        /// <param name="file">Ficheiro a carregar (PDF ou TXT, máx. 10MB).</param>
        [HttpPost("{id}/context")]
        [Consumes("multipart/form-data")] // So aceita pedidos do Content-Type multipart/form-data (formulário com ficheiro)
        public async Task<ActionResult<DocumentContextDto>> UploadContext(int id, IFormFile file)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            if (file.Length > 10 * 1024 * 1024)
                return BadRequest(new { message = "File size exceeds 10MB limit." });

            var allowedTypes = new[] { "application/pdf", "text/plain" };
            if (!allowedTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { message = "Allowed formats: PDF, TXT." });

            var document = await _context.Document
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (document is null)
                return NotFound(new { message = "Document not found." });

            // Verificar membro da equipa
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

            // Apenas Editor ou Owner podem adicionar contexto
            bool isOwner = userTeamMember.Role == TeamRole.Owner;
            bool canEdit = isOwner;

            if (!canEdit)
            {
                var permission = await _context.DocumentPermission
                    .FirstOrDefaultAsync(dp => dp.TeamMemberId == userTeamMember.Id && dp.DocumentId == document.Id);

                canEdit = permission?.Role == DocumentRole.Editor;
            }

            if (!canEdit)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Editors and Owners can upload context files." }
                });
            }

            // Extração de texto - copiar stream para memória para poder reutilizá-lo no upload
            byte[] fileBytes;
            using (var ms = new MemoryStream())
            {
                await file.OpenReadStream().CopyToAsync(ms);
                fileBytes = ms.ToArray();
            }

            string? extractedText;
            using (var extractStream = new MemoryStream(fileBytes))
            {
                extractedText = await _textExtractionService.ExtractTextAsync(extractStream, file.ContentType);
            }

            // Upload do ficheiro para storage
            string storedPath;
            using (var uploadStream = new MemoryStream(fileBytes))
            {
                storedPath = await _storageService.UploadContextFileAsync(uploadStream, file.FileName, file.ContentType);
            }

            var user = await _userManager.FindByIdAsync(userId);
            var contextFile = new DocumentContext
            {
                DocumentId = id,
                FileName = file.FileName,
                ContentType = file.ContentType,
                StoredPath = storedPath,
                ExtractedText = extractedText,
                FileSizeBytes = file.Length,
                UploadedAt = DateTime.UtcNow,
                UploadedById = userId
            };

            _context.DocumentContext.Add(contextFile);
            await _context.SaveChangesAsync();

            var dto = new DocumentContextDto
            {
                Id = contextFile.Id,
                DocumentId = contextFile.DocumentId,
                FileName = contextFile.FileName,
                ContentType = contextFile.ContentType,
                FileSizeBytes = contextFile.FileSizeBytes,
                UploadedAt = contextFile.UploadedAt,
                UploadedByName = user?.FullName ?? user?.Email ?? string.Empty,
                HasExtractedText = extractedText != null
            };

            return CreatedAtAction(nameof(GetContextFiles), new { id }, dto);
        }

        /// <summary>
        /// Lista os ficheiros de contexto associados ao documento.
        /// Apenas Editors e Owners podem listar (Viewers não têm acesso ao painel de IA).
        /// </summary>
        /// <param name="id">ID do documento.</param>
        [HttpGet("{id}/context")]
        public async Task<ActionResult<IEnumerable<DocumentContextDto>>> GetContextFiles(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (document is null)
                return NotFound(new { message = "Document not found." });

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

            bool isOwner = userTeamMember.Role == TeamRole.Owner;
            bool canEdit = isOwner;

            if (!canEdit)
            {
                var permission = await _context.DocumentPermission
                    .FirstOrDefaultAsync(dp => dp.TeamMemberId == userTeamMember.Id && dp.DocumentId == document.Id);
                canEdit = permission?.Role == DocumentRole.Editor;
            }

            if (!canEdit)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Editors and Owners can view context files." }
                });
            }

            var contextFiles = await _context.DocumentContext
                .Include(dc => dc.UploadedBy)
                .Where(dc => dc.DocumentId == id)
                .OrderByDescending(dc => dc.UploadedAt)
                .Select(dc => new DocumentContextDto
                {
                    Id = dc.Id,
                    DocumentId = dc.DocumentId,
                    FileName = dc.FileName,
                    ContentType = dc.ContentType,
                    FileSizeBytes = dc.FileSizeBytes,
                    UploadedAt = dc.UploadedAt,
                    UploadedByName = dc.UploadedBy.FullName ?? dc.UploadedBy.Email ?? string.Empty,
                    HasExtractedText = dc.ExtractedText != null
                })
                .ToListAsync();

            return Ok(contextFiles);
        }

        /// <summary>
        /// Remove um ficheiro de contexto do documento.
        /// Apenas Editors podem remover contexto.
        /// </summary>
        /// <param name="id">ID do documento.</param>
        /// <param name="contextId">ID do ficheiro de contexto.</param>
        [HttpDelete("{id}/context/{contextId}")]
        public async Task<IActionResult> DeleteContext(int id, int contextId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var document = await _context.Document
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (document is null)
                return NotFound(new { message = "Document not found." });

            var contextFile = await _context.DocumentContext
                .FirstOrDefaultAsync(dc => dc.Id == contextId && dc.DocumentId == id);

            if (contextFile is null)
                return NotFound(new { message = "Context file not found." });

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

            bool isOwner = userTeamMember.Role == TeamRole.Owner;
            bool canEdit = isOwner;

            if (!canEdit)
            {
                var permission = await _context.DocumentPermission
                    .FirstOrDefaultAsync(dp => dp.TeamMemberId == userTeamMember.Id && dp.DocumentId == document.Id);

                canEdit = permission?.Role == DocumentRole.Editor;
            }

            if (!canEdit)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Editors and Owners can remove context files." }
                });
            }

            // Remover do storage antes de apagar da BD
            await _storageService.DeleteContextFileAsync(contextFile.StoredPath);

            _context.DocumentContext.Remove(contextFile);
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

        // GET /api/documents/{id}/ydoc
        // Devolve o snapshot Y.Doc para inicializar um novo cliente de colaboração
        [HttpGet("{id}/ydoc")]
        public async Task<IActionResult> GetYDocSnapshot(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null) return Unauthorized();

            var doc = await _context.Document
                .Include(d => d.Team)
                    .ThenInclude(t => t.Members)
                .Include(d => d.Permissions)
                    .ThenInclude(p => p.TeamMember)
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

            if (doc is null) return NotFound();

            // Verificar acesso (mesmo critério do Hub)
            var member = doc.Team.Members.FirstOrDefault(m => m.UserId == userId);
            if (member is null) return Forbid();

            bool hasAccess = member.Role >= TeamRole.TeamAdmin ||
                             doc.Permissions.Any(p => p.TeamMember.UserId == userId);
            if (!hasAccess) return Forbid();

            // Devolver snapshot como Base64 (ou null se ainda não existe)
            if (doc.YDocSnapshot is { Length: > 0 })
                return Ok(new { snapshot = Convert.ToBase64String(doc.YDocSnapshot) });

            return Ok(new { snapshot = (string?)null });
        }
    }
}
