namespace Fluxnote.Backend.Dtos.Auth;

public class LoginRequest
{
    public string Email { get; set; } = default!;
    public string Password { get; set; } = default!;
    public bool RememberMe { get; set; }
}
