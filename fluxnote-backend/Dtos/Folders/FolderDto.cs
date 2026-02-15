using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Folders
{
    public class FolderDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int TeamId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int DocumentCount { get; set; }
    }

    public class CreateFolderRequest
    {
        [Required(ErrorMessage = "Folder name is required.")]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public int TeamId { get; set; }
    }

    public class UpdateFolderRequest
    {
        [Required(ErrorMessage = "Folder name is required.")]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
    }
}
