namespace Fluxnote.Backend.Models
{
    public class Team
{
        public int Id { get; set; }

        public string Name { get; set; }

        public int OwnerId { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        public bool IsActive { get; set; }

        public DateTime? DeletionScheduled { get; set; }

        public int MemberCount { get; set; }

        public List<TeamMember> TeamMembers { get; set; }
    }
}
