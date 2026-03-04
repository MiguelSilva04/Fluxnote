using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// Request para sugerir melhorias num excerto de texto selecionado pelo utilizador.
    /// </summary>
    public class ImproveTextRequest
    {
        /// <summary>
        /// Texto selecionado pelo utilizador no editor.
        /// </summary>
        [Required(ErrorMessage = "Selected text is required.")]
        [StringLength(5000, ErrorMessage = "Selected text must not exceed 5000 characters.")]
        public string SelectedText { get; set; } = string.Empty;
    }
}
