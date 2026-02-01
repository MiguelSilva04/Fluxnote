using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models
{
    public class TeamMember
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public TeamRole Role { get; set; }

        public string? UserId { get; set; }        

        public int? TeamId { get; set; } 

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        // Documentos a que este membro tem acesso
        public ICollection<DocumentPermission> DocumentPermissions { get; set; } = new List<DocumentPermission>();

    }

    public enum TeamRole
    {
        [Display(Name = "Member")]
        Member = 0,

        [Display(Name = "Team Admin")]
        TeamAdmin = 1,

        [Display(Name = "Owner")]
        Owner = 2
    }

}
