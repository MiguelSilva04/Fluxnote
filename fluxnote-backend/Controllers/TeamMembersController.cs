using Fluxnote.Backend.Data;
using Fluxnote.Backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Fluxnote.Backend.Controllers
{
    /// <summary>
    /// Controlador para gestão de membros de equipas.
    /// Permite operações CRUD sobre a associação entre utilizadores e equipas.
    /// </summary>
    /// <remarks>
    /// <b>Rota Base:</b> api/team-members
    ///
    /// <b>⚠️ AVISO DE SEGURANÇA:</b><br/>
    /// Este controlador NÃO tem autenticação nem validação de permissões implementada.<br/>
    /// Qualquer pessoa pode listar, criar, modificar ou eliminar membros de qualquer equipa.<br/>
    /// Deve ser implementado:
    /// <list type="bullet">
    ///     <item><description>[Authorize] para requerer autenticação</description></item>
    ///     <item><description>Verificação de que o utilizador é Owner ou TeamAdmin da equipa</description></item>
    ///     <item><description>Prevenção de auto-remoção do último Owner</description></item>
    /// </list>
    ///
    /// <b>Endpoints Disponíveis:</b>
    /// <list type="table">
    ///     <listheader>
    ///         <term>Método</term>
    ///         <description>Rota e Descrição</description>
    ///     </listheader>
    ///     <item><term>GET</term><description>/ - Listar todos os membros (sem filtro!)</description></item>
    ///     <item><term>GET</term><description>/{id} - Obter membro específico</description></item>
    ///     <item><term>POST</term><description>/ - Adicionar membro a uma equipa</description></item>
    ///     <item><term>PUT</term><description>/{id} - Atualizar papel do membro</description></item>
    ///     <item><term>DELETE</term><description>/{id} - Remover membro da equipa</description></item>
    /// </list>
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class TeamMembersController : ControllerBase
    {
        private readonly FluxnoteServerContext _context;

        /// <summary>
        /// Construtor com injeção de dependências.
        /// </summary>
        /// <param name="context">Contexto da base de dados.</param>
        public TeamMembersController(FluxnoteServerContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Lista todos os membros de todas as equipas.
        /// </summary>
        /// <returns>Lista de todos os TeamMember no sistema.</returns>
        /// <remarks>
        /// <b>⚠️ VULNERABILIDADE:</b> Este endpoint não tem filtros nem autenticação.<br/>
        /// Expõe informação de membros de TODAS as equipas.
        /// </remarks>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TeamMember>>> GetTeamMember()
        {
           return await _context.TeamMember.ToListAsync();
        }

        /// <summary>
        /// Obtém um membro específico pelo ID.
        /// </summary>
        /// <param name="id">ID do TeamMember.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>200 OK:</b> Dados do membro.</item>
        ///     <item><b>404 Not Found:</b> Membro não encontrado.</item>
        /// </list>
        /// </returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<TeamMember>> GetTeamMember(int id)
        {
            var teamMember = await _context.TeamMember.FindAsync(id);

            if (teamMember == null)
            {
                return NotFound();
            }

            return teamMember;
        }

        /// <summary>
        /// Atualiza os dados de um membro de equipa.
        /// </summary>
        /// <param name="id">ID do TeamMember.</param>
        /// <param name="teamMember">Dados atualizados do membro.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>204 No Content:</b> Membro atualizado com sucesso.</item>
        ///     <item><b>400 Bad Request:</b> ID não corresponde ao objeto.</item>
        ///     <item><b>404 Not Found:</b> Membro não encontrado.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>Uso típico:</b> Alterar o Role de um membro (promover/despromover).<br/>
        /// <b>⚠️ VULNERABILIDADE:</b> Sem validação de permissões.
        /// </remarks>
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTeamMember(int id, TeamMember teamMember)
        {
            if (id != teamMember.Id)
            {
                return BadRequest();
            }

            _context.Entry(teamMember).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TeamMemberExists(id))
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
        /// Adiciona um novo membro a uma equipa.
        /// </summary>
        /// <param name="teamMember">Dados do novo membro (Name, UserId, TeamId, Role).</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>201 Created:</b> Membro adicionado com sucesso.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>Campos esperados:</b>
        /// <list type="bullet">
        ///     <item><description><b>Name:</b> Nome de exibição na equipa</description></item>
        ///     <item><description><b>UserId:</b> ID do utilizador (pode ser null para convites)</description></item>
        ///     <item><description><b>TeamId:</b> ID da equipa</description></item>
        ///     <item><description><b>Role:</b> Papel na equipa (0=Member, 1=TeamAdmin, 2=Owner)</description></item>
        /// </list>
        /// <b>⚠️ VULNERABILIDADE:</b> Sem validação de permissões. Qualquer um pode adicionar membros.
        /// </remarks>
        [HttpPost]
        public async Task<ActionResult<TeamMember>> PostTeamMember(TeamMember teamMember)
        {
            _context.TeamMember.Add(teamMember);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetTeamMember", new { id = teamMember.Id }, teamMember);
        }

        /// <summary>
        /// Remove um membro de uma equipa.
        /// </summary>
        /// <param name="id">ID do TeamMember a remover.</param>
        /// <returns>
        /// <list type="bullet">
        ///     <item><b>204 No Content:</b> Membro removido com sucesso.</item>
        ///     <item><b>404 Not Found:</b> Membro não encontrado.</item>
        /// </list>
        /// </returns>
        /// <remarks>
        /// <b>⚠️ VULNERABILIDADES:</b>
        /// <list type="bullet">
        ///     <item><description>Sem verificação de autenticação</description></item>
        ///     <item><description>Sem verificação de permissões (Owner/TeamAdmin)</description></item>
        ///     <item><description>Permite remover o único Owner de uma equipa</description></item>
        ///     <item><description>Permite que qualquer pessoa remova membros de qualquer equipa</description></item>
        /// </list>
        /// </remarks>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTeamMember(int id)
        {
            var teamMember = await _context.TeamMember.FindAsync(id);
            if (teamMember == null)
            {
                return NotFound();
            }

            _context.TeamMember.Remove(teamMember);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool TeamMemberExists(int id)
        {
            return _context.TeamMember.Any(e => e.Id == id);
        }
    }
}
