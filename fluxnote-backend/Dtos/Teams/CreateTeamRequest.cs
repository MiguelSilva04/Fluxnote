using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Teams
{
    /// <summary>
    /// DTO para criação de uma nova equipa.
    /// </summary>
    public class CreateTeamRequest
    {
        /// <summary>Nome da equipa (obrigatório).</summary>
        [Required(ErrorMessage = "Team name is required.")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Team name must be between 1 and 100 characters.")]
        public string Name { get; set; } = string.Empty;
    }
}
