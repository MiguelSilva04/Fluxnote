using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models;

public class DocumentPermission
{
    public int Id { get; set; }

    // Foreign Keys
    [Required]
    public int DocumentId { get; set; } = default!;
    [Required]
    public int TeamMemberId { get; set; } = default!;
    // Role no documento
    public DocumentRole Role { get; set; } = DocumentRole.Viewer;
    
    //Metadata
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Document Document { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
}
