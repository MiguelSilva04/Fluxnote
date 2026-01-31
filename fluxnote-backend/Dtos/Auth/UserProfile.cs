namespace Fluxnote.Backend.Dtos.Auth;

public class UserProfile
{
    public string Id { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string FullName { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public string ProfilePictureUrl { get; set; } = default!;
    public string? Location { get; set; } = default!;
    public string PhoneNumber { get; set; } = default!;
    public string? Bio { get; set; }
    public string? Timezone { get; set; }
    public DateTime CreatedAt { get; set; }
    public int UsernameChangesRemaining { get; set; }
}
