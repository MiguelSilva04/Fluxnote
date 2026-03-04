using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Folders;
using Fluxnote.Backend.Dtos.Teams;
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
    /// Controlador responsável pela gestão de equipas colaborativas.
    /// </summary>
    /// <remarks>
    /// <b>Rota Base:</b> api/teams<br/>
    /// <b>Autenticação:</b> JWT Bearer obrigatório em todos os endpoints.
    ///
    /// <b>Endpoints Disponíveis:</b>
    /// <list type="table">
    ///     <listheader>
    ///         <term>Método</term>
    ///         <description>Rota e Descrição</description>
    ///     </listheader>
    ///     <item><term>GET</term><description>/ - Listar equipas do utilizador</description></item>
    ///     <item><term>GET</term><description>/{id} - Obter detalhes de uma equipa</description></item>
    ///     <item><term>POST</term><description>/ - Criar nova equipa</description></item>
    ///     <item><term>PUT</term><description>/{id} - Atualizar equipa</description></item>
    ///     <item><term>DELETE</term><description>/{id} - Eliminar equipa (cascade)</description></item>
    /// </list>
    ///
    /// <b>Notas:</b>
    /// <list type="bullet">
    ///     <item><description>Equipas são normalmente criadas via DocumentsController (ao criar documento)</description></item>
    ///     <item><description>Eliminação remove em cascata todos os membros e documentos</description></item>
    ///     <item><description>CurrentUserRole indica o papel do utilizador na equipa (0=Member, 1=TeamAdmin, 2=Owner)</description></item>
    /// </list>
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class TeamsController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;
        private readonly UserManager<User> _userManager;

        /// <summary>
        /// Construtor com injeção de dependências.
        /// </summary>
        /// <param name="context">Contexto da base de dados.</param>
        public TeamsController(FluxnoteServerContext context, UserManager<User> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        /// <summary>
        /// Lista todas as equipas onde o utilizador é membro.
        /// </summary>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>200 OK:</b> Lista de TeamDto com membros e documentos.</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>Dados Incluídos:</b>
        /// <list type="bullet">
        ///     <item><description>Informação básica da equipa (nome, datas, estado)</description></item>
        ///     <item><description>Lista de membros com papéis</description></item>
        ///     <item><description>Lista de documentos não eliminados</description></item>
        ///     <item><description>CurrentUserRole: papel do utilizador nessa equipa</description></item>
        /// </list>
        /// </remarks>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TeamDto>>> GetTeams()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            // Obter equipas onde o utilizador é membro (incluindo a role e memberId)
            var userMemberships = await _context.TeamMember
                .Where(m => m.UserId == userId && m.TeamId != null)
                .Select(m => new { TeamId = m.TeamId!.Value, Role = (int)m.Role, MemberId = m.Id })
                .ToListAsync();

            var userTeamMemberships = userMemberships.ToDictionary(m => m.TeamId, m => m.Role);

            // Para equipas onde o utilizador é Member (role 0), obter IDs de documentos acessíveis
            var memberTeamEntries = userMemberships.Where(m => m.Role == 0).ToList();
            var accessibleDocIdsByTeam = new Dictionary<int, HashSet<int>>();

            if (memberTeamEntries.Any())
            {
                var memberIds = memberTeamEntries.Select(m => m.MemberId).ToList();
                var permissions = await _context.DocumentPermission
                    .Where(p => memberIds.Contains(p.TeamMemberId))
                    .Select(p => new { p.DocumentId, p.TeamMember.TeamId })
                    .ToListAsync();

                foreach (var entry in memberTeamEntries)
                {
                    accessibleDocIdsByTeam[entry.TeamId] = permissions
                        .Where(p => p.TeamId == entry.TeamId)
                        .Select(p => p.DocumentId)
                        .ToHashSet();
                }
            }

            var teams = await _context.Team
                .Include(t => t.Members)
                .Include(t => t.Documents.Where(d => !d.IsDeleted))
                .Include(t => t.Folders)
                .Where(t => userTeamMemberships.Keys.Contains(t.Id))
                .Select(t => new TeamDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    OwnerId = t.OwnerId,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt,
                    IsActive = t.IsActive,
                    DeletionScheduled = t.DeletionScheduled,
                    Members = t.Members.Select(m => new TeamMemberDto
                    {
                        Id = m.Id,
                        Name = m.Name,
                        UserId = m.UserId,
                        Role = (int)m.Role,
                        JoinedAt = m.JoinedAt
                    }).ToList(),
                    Documents = t.Documents.Where(d => !d.IsDeleted).Select(d => new TeamDocumentDto
                    {
                        Id = d.Id,
                        Title = d.Title,
                        UpdatedAt = d.UpdatedAt,
                        CreatedById = d.CreatedById,
                        FolderId = d.FolderId
                    }).ToList(),
                    Folders = t.Folders.Select(f => new FolderDto
                    {
                        Id = f.Id,
                        Name = f.Name,
                        TeamId = f.TeamId,
                        CreatedAt = f.CreatedAt,
                        UpdatedAt = f.UpdatedAt
                    }).OrderBy(f => f.Name).ToList()
                })
                .ToListAsync();

            // Preencher CurrentUserRole, filtrar documentos por acesso e calcular DocumentCount
            foreach (var team in teams)
            {
                team.CurrentUserRole = userTeamMemberships.GetValueOrDefault(team.Id, 0);

                // Members (role 0): filtrar documentos para apenas os que têm permissão
                if (team.CurrentUserRole == 0 && accessibleDocIdsByTeam.TryGetValue(team.Id, out var accessibleIds))
                {
                    team.Documents = team.Documents.Where(d => accessibleIds.Contains(d.Id)).ToList();
                }

                // Calcular contagem de documentos por pasta
                foreach (var folder in team.Folders)
                {
                    folder.DocumentCount = team.Documents.Count(d => d.FolderId == folder.Id);
                }
                // Members só vêem pastas com documentos acessíveis; Owner/Admin vêem todas
                if (team.CurrentUserRole == 0)
                {
                    team.Folders = team.Folders.Where(f => f.DocumentCount > 0).ToList();
                }
            }

            return Ok(teams);
        }

        /// <summary>
        /// Obtém os detalhes de uma equipa específica.
        /// </summary>
        /// <param name="id">ID da equipa.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>200 OK:</b> Detalhes da equipa (TeamDto).</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        ///     <item><b>403 Forbidden:</b> Utilizador não é membro da equipa.</item>
        ///     <item><b>404 Not Found:</b> Equipa não encontrada.</item>
        /// </list>
        /// </returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<TeamDto>> GetTeam(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            // Verificar se o utilizador é membro da equipa e obter a sua role
            var membership = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == id && m.UserId == userId);

            if (membership == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You are not a member of this team." }
                });
            }

            var teamQuery = _context.Team
                .Include(t => t.Members)
                .Include(t => t.Documents.Where(d => !d.IsDeleted))
                    .ThenInclude(d => d.Permissions)
                        .ThenInclude(p => p.TeamMember)
                .Include(t => t.Folders);

            var team = await teamQuery.FirstOrDefaultAsync(t => t.Id == id);

            if (team == null)
            {
                return NotFound(new { message = "Team not found." });
            }

            var isOwner = membership.Role == TeamRole.Owner;

            var dto = new TeamDto
            {
                Id = team.Id,
                Name = team.Name,
                OwnerId = team.OwnerId,
                CreatedAt = team.CreatedAt,
                UpdatedAt = team.UpdatedAt,
                IsActive = team.IsActive,
                DeletionScheduled = team.DeletionScheduled,
                CurrentUserRole = (int)membership.Role,
                Members = team.Members.Select(m => new TeamMemberDto
                {
                    Id = m.Id,
                    Name = m.Name,
                    UserId = m.UserId,
                    Role = (int)m.Role,
                    JoinedAt = m.JoinedAt
                }).ToList(),
                Documents = team.Documents.Where(d => !d.IsDeleted).Select(d => new TeamDocumentDto
                {
                    Id = d.Id,
                    Title = d.Title,
                    UpdatedAt = d.UpdatedAt,
                    CreatedById = d.CreatedById,
                    FolderId = d.FolderId,
                    // Apenas Owner vê todos os documentos; TeamAdmin e Member precisam de DocumentPermission
                    Permissions = isOwner
                        ? d.Permissions.Select(p => new DocumentPermissionSummaryDto
                        {
                            Id = p.Id,
                            TeamMemberId = p.TeamMemberId,
                            MemberName = p.TeamMember.Name,
                            MemberRole = (int)p.TeamMember.Role,
                            DocumentRole = (int)p.Role
                        }).ToList()
                        : (d.Permissions.Any(p => p.TeamMemberId == membership.Id)
                            ? d.Permissions.Select(p => new DocumentPermissionSummaryDto
                            {
                                Id = p.Id,
                                TeamMemberId = p.TeamMemberId,
                                MemberName = p.TeamMember.Name,
                                MemberRole = (int)p.TeamMember.Role,
                                DocumentRole = (int)p.Role
                            }).ToList()
                            : new List<DocumentPermissionSummaryDto>())
                }).ToList(),
                Folders = team.Folders.Select(f => new FolderDto
                {
                    Id = f.Id,
                    Name = f.Name,
                    TeamId = f.TeamId,
                    CreatedAt = f.CreatedAt,
                    UpdatedAt = f.UpdatedAt,
                    DocumentCount = team.Documents.Count(d => !d.IsDeleted && d.FolderId == f.Id)
                }).OrderBy(f => f.Name).ToList()
            };

            return Ok(dto);
        }

        /// <summary>
        /// Atualiza os dados de uma equipa.
        /// </summary>
        /// <param name="id">ID da equipa.</param>
        /// <param name="request">Dados a atualizar (nome, opcionalmente OwnerId).</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>204 No Content:</b> Equipa atualizada com sucesso.</item>
        ///     <item><b>400 Bad Request:</b> Dados inválidos.</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        ///     <item><b>403 Forbidden:</b> Sem permissão para atualizar.</item>
        ///     <item><b>404 Not Found:</b> Equipa não encontrada.</item>
        /// </list>
        /// </returns>
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTeam(int id, UpdateTeamRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Team name cannot be empty." });

            var team = await _context.Team
                .Include(t => t.Members)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (team == null)
                return NotFound(new { message = "Team not found." });

            // Verificar se o utilizador é membro da equipa
            var membership = team.Members.FirstOrDefault(m => m.UserId == userId);
            if (membership == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You are not a member of this team." }
                });
            }

            // Apenas Owner ou TeamAdmin podem atualizar a equipa
            if (membership.Role != TeamRole.Owner && membership.Role != TeamRole.TeamAdmin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the team owner or admin can update the team." }
                });
            }

            // Atualizar campos permitidos
            team.Name = request.Name.Trim();
            team.UpdatedAt = DateTime.UtcNow;

            // Permitir definir OwnerId (usado no fluxo de criação)
            if (request.OwnerId.HasValue)
            {
                // Apenas Owner pode alterar o OwnerId
                if (membership.Role != TeamRole.Owner && team.OwnerId != 0)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = "Permission denied.",
                        errors = new[] { "Only the team owner can change the owner." }
                    });
                }

                // Verificar que o novo owner é um membro válido da equipa
                var newOwner = team.Members.FirstOrDefault(m => m.Id == request.OwnerId.Value);
                if (newOwner == null)
                {
                    return BadRequest(new { message = "The specified owner is not a member of the team." });
                }

                team.OwnerId = request.OwnerId.Value;
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Atualiza o nome de uma equipa. Apenas o Owner pode executar esta operação.
        /// </summary>
        [HttpPatch("{id}")]
        public async Task<IActionResult> PatchTeamName(int id, [FromBody] CreateTeamRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var team = await _context.Team
                .Include(t => t.Members)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (team == null)
                return NotFound(new { message = "Team not found." });

            var membership = team.Members.FirstOrDefault(m => m.UserId == userId);
            if (membership == null)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not a member of this team." });

            if (membership.Role != TeamRole.Owner)
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only the team owner can rename the team." });

            team.Name = request.Name.Trim();
            team.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Cria uma nova equipa.
        /// </summary>
        /// <param name="request">Dados da equipa a criar (nome).</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>201 Created:</b> Equipa criada com sucesso.</item>
        ///     <item><b>400 Bad Request:</b> Dados inválidos.</item>
        ///     <item><b>401 Unauthorized:</b> Token inválido.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>Nota:</b> Na prática, equipas são normalmente criadas através do
        /// DocumentsController quando um documento é criado sem especificar equipa.
        /// </remarks>
        [HttpPost]
        public async Task<ActionResult<Team>> PostTeam(CreateTeamRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });
            
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
                return Unauthorized(new { message = "User not found." });

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Team name cannot be empty." });


            var team = new Team
            {
                Name = request.Name.Trim(),
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

            return CreatedAtAction("GetTeam", new { id = team.Id }, team);
        }

        /// <summary>
        /// Elimina uma equipa e todos os seus dados associados.
        /// </summary>
        /// <param name="id">ID da equipa a eliminar.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>204 No Content:</b> Equipa eliminada com sucesso.</item>
        ///     <item><b>404 Not Found:</b> Equipa não encontrada.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>OPERAÇÃO DESTRUTIVA - Eliminação em Cascata:</b>
        /// <list type="bullet">
        ///     <item><description>Todos os TeamMember da equipa são removidos</description></item>
        ///     <item><description>Todos os Document da equipa são removidos</description></item>
        ///     <item><description>A equipa é removida</description></item>
        /// </list>
        /// <b>Nota:</b> Este endpoint necessita de validação de permissões (apenas Owner deveria poder eliminar).
        /// </remarks>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTeam(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });
            var team = await _context.Team
                .Include(t => t.Members)
                .Include(t => t.Documents)
                .Include(t => t.Folders)
                .FirstOrDefaultAsync(t => t.Id == id);
                
            if (team == null)
            {
                return NotFound();
            }

            var isOwner = team.Members.Any(m => m.UserId == userId && m.Role == TeamRole.Owner);
            if (!isOwner)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the team owner can delete the team." }
                });
            }

            // Remove DocumentPermissions e DocumentInvites associados aos documentos da equipa
            var documentIds = team.Documents.Select(d => d.Id).ToList();
            if (documentIds.Any())
            {
                var permissions = await _context.DocumentPermission
                    .Where(p => documentIds.Contains(p.DocumentId))
                    .ToListAsync();
                if (permissions.Any())
                    _context.DocumentPermission.RemoveRange(permissions);

                var invites = await _context.DocumentInvite
                    .Where(i => documentIds.Contains(i.DocumentId))
                    .ToListAsync();
                if (invites.Any())
                    _context.DocumentInvite.RemoveRange(invites);
            }

            // Limpar FolderId dos documentos antes de remover pastas (NoAction no DB)
            foreach (var doc in team.Documents)
            {
                doc.FolderId = null;
            }

            // Remove todas as pastas da equipa
            if (team.Folders != null && team.Folders.Any())
            {
                _context.Folder.RemoveRange(team.Folders);
            }

            // Remove todos os membros da equipa
            if (team.Members != null && team.Members.Any())
            {
                _context.TeamMember.RemoveRange(team.Members);
            }

            // Remove todos os documentos da equipa
            if (team.Documents != null && team.Documents.Any())
            {
                _context.Document.RemoveRange(team.Documents);
            }

            // Agora remove a equipa
            _context.Team.Remove(team);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool TeamExists(int id)
        {
            return _context.Team.Any(e => e.Id == id);
        }
    }
}
