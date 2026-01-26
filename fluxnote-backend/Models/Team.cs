using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models
{
    public class Team
    {
        public int Id { get; set; }

        [Required(ErrorMessage ="A equipa precisa de nome")]
        public string Name { get; set; } = string.Empty;

        //public required TeamMember Owner { get; set; }

        public int OwnerId { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        public bool IsActive { get; set; }

        public DateTime? DeletionScheduled { get; set; }

        //Navigation property
        public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
    }
}
