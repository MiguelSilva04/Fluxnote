using Fluxnote.Backend.Data;
using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Fluxnote.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class TeamMembersController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;

        public TeamMembersController(FluxnoteServerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Atualiza o papel (TeamRole) de um membro de equipa.
        /// Apenas o Owner pode alterar roles.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTeamMember(int id, [FromBody] UpdateTeamMemberRoleRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var targetMember = await _context.TeamMember.FindAsync(id);
            if (targetMember == null)
                return NotFound(new { message = "Team member not found." });

            // Obter o caller como membro da mesma equipa
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == targetMember.TeamId && m.UserId == userId);

            if (callerMember == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You are not a member of this team." }
                });
            }

            // Apenas o Owner pode alterar TeamRoles
            if (callerMember.Role != TeamRole.Owner)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only the team Owner can change member roles." }
                });
            }

            // O Owner não pode alterar a sua própria role
            if (targetMember.Id == callerMember.Id)
            {
                return BadRequest(new
                {
                    message = "Invalid operation.",
                    errors = new[] { "You cannot change your own role." }
                });
            }

            // Não se pode promover alguém a Owner
            if ((TeamRole)request.Role == TeamRole.Owner)
            {
                return BadRequest(new
                {
                    message = "Invalid operation.",
                    errors = new[] { "Cannot assign Owner role. Use ownership transfer instead." }
                });
            }

            // Validar que o role é válido (Member ou TeamAdmin)
            if (request.Role != (int)TeamRole.Member && request.Role != (int)TeamRole.TeamAdmin)
            {
                return BadRequest(new
                {
                    message = "Invalid role.",
                    errors = new[] { "Role must be Member (0) or TeamAdmin (1)." }
                });
            }

            targetMember.Role = (TeamRole)request.Role;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Remove um membro de uma equipa.
        /// Owner pode remover qualquer membro exceto si próprio.
        /// TeamAdmin pode remover apenas Members.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTeamMember(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId is null)
                return Unauthorized(new { message = "User not authenticated." });

            var targetMember = await _context.TeamMember.FindAsync(id);
            if (targetMember == null)
                return NotFound(new { message = "Team member not found." });

            // Obter o caller como membro da mesma equipa
            var callerMember = await _context.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == targetMember.TeamId && m.UserId == userId);

            if (callerMember == null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "You are not a member of this team." }
                });
            }

            // Não pode remover-se a si próprio
            if (targetMember.Id == callerMember.Id)
            {
                return BadRequest(new
                {
                    message = "Invalid operation.",
                    errors = new[] { "You cannot remove yourself from the team." }
                });
            }

            // Verificar permissões baseadas na role do caller
            if (callerMember.Role == TeamRole.Owner)
            {
                // Owner pode remover qualquer membro (exceto si próprio, já validado acima)
            }
            else if (callerMember.Role == TeamRole.TeamAdmin)
            {
                // TeamAdmin só pode remover Members
                if (targetMember.Role == TeamRole.Owner || targetMember.Role == TeamRole.TeamAdmin)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = "Permission denied.",
                        errors = new[] { "A Team Admin cannot remove an Owner or another Team Admin." }
                    });
                }
            }
            else
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Permission denied.",
                    errors = new[] { "Only Owner or Team Admin can remove members." }
                });
            }

            // Remover também as DocumentPermissions do membro
            var permissions = await _context.DocumentPermission
                .Where(dp => dp.TeamMemberId == targetMember.Id)
                .ToListAsync();
            _context.DocumentPermission.RemoveRange(permissions);

            _context.TeamMember.Remove(targetMember);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool TeamMemberExists(int id)
        {
            return _context.TeamMember.Any(e => e.Id == id);
        }
    }

    public class UpdateTeamMemberRoleRequest
    {
        public int Role { get; set; }
    }
}
