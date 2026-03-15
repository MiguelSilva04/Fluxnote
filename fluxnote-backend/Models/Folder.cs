using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models
{
    /// <summary>
    /// Entidade que representa uma pasta para organização de documentos numa equipa.
    /// </summary>
    public class Folder
    {
        /// <summary>Identificador único da pasta.</summary>
        public int Id { get; set; }

        /// <summary>Nome da pasta.</summary>
        [Required(ErrorMessage = "Folder name is required.")]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>ID da equipa proprietária da pasta.</summary>
        public int TeamId { get; set; }

        /// <summary>ID do utilizador que criou a pasta.</summary>
        [Required]
        public string CreatedById { get; set; } = string.Empty;

        /// <summary>Data de criação da pasta (UTC).</summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Data da última atualização da pasta (UTC).</summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Equipa à qual a pasta pertence.</summary>
        public Team Team { get; set; } = null!;

        /// <summary>Utilizador que criou a pasta.</summary>
        public User CreatedBy { get; set; } = null!;

        /// <summary>Documentos atualmente associados à pasta.</summary>
        public ICollection<Document> Documents { get; set; } = new List<Document>();
    }
}
