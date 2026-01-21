namespace Fluxnote.Backend.Models
{
    public class TeamMember
{
        public int Id { get; set; }

        public string Role { get; set; }

        public int PersonId { get; set; }

        public int TeamId { get; set; }

        public DateTime JoinedAt { get; set; }

    }
}
