using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Teams
{
    /// <summary>
    /// DTO para atualização de uma equipa existente.
    /// </summary>
    public class UpdateTeamRequest
    {
        /// <summary>Nome da equipa (obrigatório).</summary>
        [Required(ErrorMessage = "Team name is required.")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Team name must be between 1 and 100 characters.")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// ID do membro proprietário (usado somente durante o fluxo de criação).
        /// </summary>
        public int? OwnerId { get; set; }
    }
}
