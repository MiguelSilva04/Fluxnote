namespace Fluxnote.Backend.Dtos.Auth;

/// <summary>
/// DTO de resposta para login bem-sucedido.
/// </summary>
/// <param name="AccessToken">Token JWT para autenticação em pedidos subsequentes.</param>
/// <param name="ExpiresInSeconds">Tempo até expiração do access token em segundos (padrão: 900 = 15 min).</param>
/// <remarks>
/// <b>Uso do AccessToken:</b>
/// <code>Authorization: Bearer {AccessToken}</code>
/// <b>Nota:</b> O refresh token é enviado via cookie HttpOnly, não nesta resposta.
/// </remarks>
public record LoginResponse(string AccessToken, int ExpiresInSeconds);