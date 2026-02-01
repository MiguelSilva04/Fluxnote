namespace Fluxnote.Backend.Dtos.Auth;

/// <summary>
/// DTO de resposta para renovação de token (refresh).
/// Usado na resposta do endpoint POST /api/auth/refresh.
/// </summary>
/// <param name="AccessToken">Novo token JWT para autenticação.</param>
/// <param name="ExpiresInSeconds">Tempo até expiração em segundos (padrão: 900 = 15 min).</param>
/// <remarks>
/// Funcionalmente idêntico a <see cref="LoginResponse"/>.<br/>
/// O refresh token atualizado é enviado via cookie HttpOnly.
/// </remarks>
public record TokenResponse(string AccessToken, int ExpiresInSeconds);