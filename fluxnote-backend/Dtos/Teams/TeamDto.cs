namespace Fluxnote.Backend.Dtos.Teams
{
    /// <summary>
    /// DTO para resposta de equipa
    /// </summary>
    public class TeamDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int OwnerId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsActive { get; set; }
        public DateTime? DeletionScheduled { get; set; }
        public List<TeamMemberDto> Members { get; set; } = new();
        public List<TeamDocumentDto> Documents { get; set; } = new();
    }

    /// <summary>
    /// DTO para membro da equipa
    /// </summary>
    public class TeamMemberDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public int Role { get; set; }
        public DateTime JoinedAt { get; set; }
    }

    /// <summary>
    /// DTO para documento na listagem de equipa (sem conteúdo)
    /// </summary>
    public class TeamDocumentDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }
}
