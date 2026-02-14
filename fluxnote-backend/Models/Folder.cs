using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models
{
    public class Folder
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "Folder name is required.")]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public int TeamId { get; set; }

        [Required]
        public string CreatedById { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Team Team { get; set; } = null!;
        public User CreatedBy { get; set; } = null!;
        public ICollection<Document> Documents { get; set; } = new List<Document>();
    }
}
