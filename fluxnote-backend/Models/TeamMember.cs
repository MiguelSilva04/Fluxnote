using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models
{
    public class TeamMember
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public TeamRole Role { get; set; }

        //Temporario
        //public int UserId { get; set; }        

        public int? TeamId { get; set; } 

        public DateTime JoinedAt { get; set; }

    }
}
