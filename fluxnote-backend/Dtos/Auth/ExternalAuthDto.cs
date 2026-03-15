namespace Fluxnote.Backend.Dtos.Auth;

/// <summary>
/// Resposta de erro para autenticação externa.
/// </summary>
public class ExternalAuthErrorResponse
{
    public string Error { get; set; } = string.Empty;
    public string? ErrorDescription { get; set; }
}

/// <summary>
/// Informação do utilizador devolvida por provider externo.
/// </summary>
public class ExternalUserInfo
{
    public string ProviderId { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? ProfilePictureUrl { get; set; }
}

