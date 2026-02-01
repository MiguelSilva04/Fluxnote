using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Teams;
using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
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

        /// <summary>
        /// Construtor com injeção de dependências.
        /// </summary>
        /// <param name="context">Contexto da base de dados.</param>
        public TeamsController(FluxnoteServerContext context)
        {
            _context = context;
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

            // Obter equipas onde o utilizador é membro (incluindo a role)
            var userTeamMemberships = await _context.TeamMember
                .Where(m => m.UserId == userId)
                .ToDictionaryAsync(m => m.TeamId, m => (int)m.Role);

            var teams = await _context.Team
                .Include(t => t.Members)
                .Include(t => t.Documents.Where(d => !d.IsDeleted))
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
                        CreatedById = d.CreatedById
                    }).ToList()
                })
                .ToListAsync();

            // Preencher CurrentUserRole após a query
            foreach (var team in teams)
            {
                team.CurrentUserRole = userTeamMemberships.GetValueOrDefault(team.Id, 0);
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

            var team = await _context.Team
                .Include(t => t.Members)
                .Include(t => t.Documents.Where(d => !d.IsDeleted))
                .FirstOrDefaultAsync(t => t.Id == id);

            if (team == null)
            {
                return NotFound(new { message = "Team not found." });
            }

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
                    CreatedById = d.CreatedById
                }).ToList()
            };

            return Ok(dto);
        }

        /// <summary>
        /// Atualiza os dados de uma equipa.
        /// </summary>
        /// <param name="id">ID da equipa.</param>
        /// <param name="team">Objeto Team com dados atualizados.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>204 No Content:</b> Equipa atualizada com sucesso.</item>
        ///     <item><b>400 Bad Request:</b> ID não corresponde ao objeto.</item>
        ///     <item><b>404 Not Found:</b> Equipa não encontrada.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>⚠️ Nota:</b> Este endpoint necessita de validação de permissões adicionais.
        /// </remarks>
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTeam(int id, Team team)
        {
            if (id != team.Id)
            {
                return BadRequest();
            }

            _context.Entry(team).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TeamExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        /// <summary>
        /// Cria uma nova equipa.
        /// </summary>
        /// <param name="team">Dados da equipa a criar.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>201 Created:</b> Equipa criada com sucesso.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>Nota:</b> Na prática, equipas são normalmente criadas através do
        /// DocumentsController quando um documento é criado sem especificar equipa.
        /// </remarks>
        [HttpPost]
        public async Task<ActionResult<Team>> PostTeam(Team team)
        {
            _context.Team.Add(team);
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
        /// <b>⚠️ OPERAÇÃO DESTRUTIVA - Eliminação em Cascata:</b>
        /// <list type="bullet">
        ///     <item><description>Todos os TeamMember da equipa são removidos</description></item>
        ///     <item><description>Todos os Document da equipa são removidos</description></item>
        ///     <item><description>A equipa é removida</description></item>
        /// </list>
        /// <b>⚠️ Nota:</b> Este endpoint necessita de validação de permissões (apenas Owner deveria poder eliminar).
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

            // Remove primeiro todos os membros da equipa
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
