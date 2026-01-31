using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Documents
{
    public class CreateDocumentRequest
    {
        [Required(ErrorMessage = "O título é obrigatório")]
        [MaxLength(255, ErrorMessage = "O título não pode ter mais de 255 caracteres")]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// ID da equipa onde o documento será criado.
        /// Se não for especificado, será criada uma nova equipa.
        /// </summary>
        public int? TeamId { get; set; }

        /// <summary>
        /// Nome da equipa a criar (obrigatório se TeamId não for especificado).
        /// </summary>
        [MaxLength(100, ErrorMessage = "O nome da equipa não pode ter mais de 100 caracteres")]
        public string? TeamName { get; set; }
    }
}
