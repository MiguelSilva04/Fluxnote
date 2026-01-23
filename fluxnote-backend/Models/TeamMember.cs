namespace Fluxnote.Backend.Models
{
    public class TeamMember
{
        public int Id { get; set; }

        public TeamRole Role { get; set; }

        //Temporario
        //public int UserId { get; set; }

        public string Name { get; set; }

        public int TeamId { get; set; }

        public Team Team { get; set; }

        public DateTime JoinedAt { get; set; }

    }
}
