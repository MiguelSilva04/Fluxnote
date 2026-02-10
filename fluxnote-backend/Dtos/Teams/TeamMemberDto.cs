namespace Fluxnote.Backend.Dtos.Teams;

public class UpdateTeamMemberRoleRequest
{
    public int Role { get; set; }
}

public class CreateTeamMemberRequest
{
    public string? Name { get; set; }
    public int Role { get; set; }
    public int? TeamId { get; set; }
    public string? UserId { get; set; }
    public string? Email { get; set; }
}
