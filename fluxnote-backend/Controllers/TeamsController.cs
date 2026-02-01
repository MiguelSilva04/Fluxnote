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
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class TeamsController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;

        public TeamsController(FluxnoteServerContext context)
        {
            _context = context;
        }

        // GET: api/Teams
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

        // GET: api/Teams/5
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

        // PUT: api/Teams/5
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

        // POST: api/Teams
        [HttpPost]
        public async Task<ActionResult<Team>> PostTeam(Team team)
        {
            _context.Team.Add(team);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetTeam", new { id = team.Id }, team);
        }

        // DELETE: api/Teams/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTeam(int id)
        {
            var team = await _context.Team
                .Include(t => t.Members)
                .Include(t => t.Documents)
                .FirstOrDefaultAsync(t => t.Id == id);
                
            if (team == null)
            {
                return NotFound();
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
