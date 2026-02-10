using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Documents
{
    public class DocumentPermissionDto
    {
        public int Id { get; set; }
        public int DocumentId { get; set; }
        public int TeamMemberId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public int MemberRole { get; set; } // TeamRole: 0=Member, 1=TeamAdmin, 2=Owner
        public int DocumentRole { get; set; } // 0=Viewer, 1=Editor
    }

    public class CreateDocumentPermissionRequest
    {
        [Required]
        public int DocumentId { get; set; }

        [Required]
        public int TeamMemberId { get; set; }

        [Required]
        public int Role { get; set; } // 0=Viewer, 1=Editor
    }

    public class UpdateDocumentPermissionRequest
    {
        [Required]
        public int Role { get; set; } // 0=Viewer, 1=Editor
    }
}
