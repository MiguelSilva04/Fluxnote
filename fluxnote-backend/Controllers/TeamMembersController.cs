using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Dtos;

namespace Fluxnote.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TeamMembersController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;

        public TeamMembersController(FluxnoteServerContext context)
        {
            _context = context;
        }

        // GET: api/TeamMembers
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TeamMemberDto>>> GetTeamMember()
        {
            return await _context.TeamMember
                .Select(m => new TeamMemberDto
                {
                    Id = m.Id,
                    Name = m.Name,
                    Role = m.Role,
                    JoinedAt = m.JoinedAt,
                    TeamId = m.Team.Id

                }).ToListAsync();
            }

        // GET: api/TeamMembers/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TeamMemberDto>> GetTeamMember(int id)
        {
            var teamMember = await _context.TeamMember
        .Where(m => m.Id == id)
        .Select(m => new TeamMemberDto
        {
            Id = m.Id,
            Name = m.Name,
            Role = m.Role,
            JoinedAt = m.JoinedAt,
            TeamId = m.Team.Id
        })
        .FirstOrDefaultAsync();

            if (teamMember == null)
            {
                return NotFound();
            }

            return teamMember;
        }

        //// PUT: api/TeamMembers/5
        //// To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        //[HttpPut("{id}")]
        //public async Task<IActionResult> PutTeamMember(int id, TeamMember teamMember)
        //{
        //    if (id != teamMember.Id)
        //    {
        //        return BadRequest();
        //    }

        //    _context.Entry(teamMember).State = EntityState.Modified;

        //    try
        //    {
        //        await _context.SaveChangesAsync();
        //    }
        //    catch (DbUpdateConcurrencyException)
        //    {
        //        if (!TeamMemberExists(id))
        //        {
        //            return NotFound();
        //        }
        //        else
        //        {
        //            throw;
        //        }
        //    }

        //    return NoContent();
        //}

        //// POST: api/TeamMembers
        //// To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        //[HttpPost]
        //public async Task<ActionResult<TeamMember>> PostTeamMember(TeamMember teamMember)
        //{
        //    _context.TeamMember.Add(teamMember);
        //    await _context.SaveChangesAsync();

        //    return CreatedAtAction("GetTeamMember", new { id = teamMember.Id }, teamMember);
        //}

        //// DELETE: api/TeamMembers/5
        //[HttpDelete("{id}")]
        //public async Task<IActionResult> DeleteTeamMember(int id)
        //{
        //    var teamMember = await _context.TeamMember.FindAsync(id);
        //    if (teamMember == null)
        //    {
        //        return NotFound();
        //    }

        //    _context.TeamMember.Remove(teamMember);
        //    await _context.SaveChangesAsync();

        //    return NoContent();
        //}

        private bool TeamMemberExists(int id)
        {
            return _context.TeamMember.Any(e => e.Id == id);
        }
    }
}
