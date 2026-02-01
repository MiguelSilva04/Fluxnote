using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models
{
    public class Document
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "O documento precisa de título")]
        [MaxLength(255)]
        public string Title { get; set; } = string.Empty;

        // FK para a equipa
        public int TeamId { get; set; }

        // Conteúdo Y.Doc serializado (VARBINARY)
        public byte[]? Content { get; set; }

        // Texto limpo para pesquisa
        public string? PlainText { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // FK para o utilizador que criou, especificamente o Owner da Equipa onde está o documento
        [Required]
        public string CreatedById { get; set; } = string.Empty;

        // Soft delete
        public bool IsDeleted { get; set; } = false;

        public DateTime? DeletedAt { get; set; }

        // Navigation properties
        public Team Team { get; set; } = null!;
        public User CreatedBy { get; set; } = null!;
    }
}
