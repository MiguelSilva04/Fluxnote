using Fluxnote.Backend.Models;

namespace Fluxnote.Backend.Dtos
{
    public class TeamMemberDto
    {
        public int Id { get; set; }

        public TeamRole Role { get; set; }

        public required string Name { get; set; }

        public DateTime JoinedAt { get; set; }
        public int TeamId { get; set; }
    }
}
