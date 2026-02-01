namespace Fluxnote.Backend.Dtos.Auth;

/// <summary>
/// DTO para pedido de autenticação (login).
/// Usado no endpoint POST /api/auth/login.
/// </summary>
/// <remarks>
/// <b>Resposta em caso de sucesso:</b>
/// <list type="bullet">
///     <item><description>Access token JWT no corpo da resposta</description></item>
///     <item><description>Refresh token no cookie HttpOnly "fluxnote_rt"</description></item>
/// </list>
/// <b>Efeito do RememberMe:</b>
/// <list type="bullet">
///     <item><description><b>false:</b> Sessão expira em 7 dias (absoluto)</description></item>
///     <item><description><b>true:</b> Sessão expira em 30 dias (absoluto)</description></item>
/// </list>
/// Em ambos os casos, inatividade de 7 dias também expira a sessão.
/// </remarks>
public class LoginRequest
{
    /// <summary>
    /// Endereço de email do utilizador.
    /// </summary>
    /// <example>user@example.com</example>
    public string Email { get; set; } = default!;

    /// <summary>
    /// Password do utilizador.
    /// </summary>
    public string Password { get; set; } = default!;

    /// <summary>
    /// Indica se a sessão deve ter duração prolongada (30 dias vs 7 dias).
    /// </summary>
    /// <remarks>
    /// Quando true: expiração absoluta de 30 dias desde o login.<br/>
    /// Quando false: expiração absoluta de 7 dias desde o login.
    /// </remarks>
    public bool RememberMe { get; set; }
}
