using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// Request para gerar conteúdo novo usando IA.
    /// </summary>
    public class GenerateContentRequest
    {
        /// <summary>
        /// Prompt do utilizador — instrução sobre o conteúdo a gerar.
        /// </summary>
        [Required(ErrorMessage = "Prompt is required.")]
        [StringLength(2000, ErrorMessage = "Prompt must not exceed 2000 characters.")]
        public string Prompt { get; set; } = string.Empty;
    }
}
