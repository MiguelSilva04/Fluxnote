namespace Fluxnote.Backend.Dtos.Auth;

/// <summary>
/// DTO de resposta com o perfil completo do utilizador.
/// Usado na resposta dos endpoints GET/PUT /api/auth/users/me.
/// </summary>
/// <remarks>
/// Este DTO é devolvido quando:
/// <list type="bullet">
///     <item><description>Utilizador consulta o seu perfil (GET /users/me)</description></item>
///     <item><description>Utilizador atualiza o seu perfil (PUT /users/me)</description></item>
/// </list>
/// </remarks>
public class UserProfile
{
    /// <summary>
    /// Identificador único do utilizador (GUID).
    /// </summary>
    public string Id { get; set; } = default!;

    /// <summary>
    /// Endereço de email do utilizador (também usado como login).
    /// </summary>
    public string Email { get; set; } = default!;

    /// <summary>
    /// Nome completo para exibição.
    /// </summary>
    public string FullName { get; set; } = default!;

    /// <summary>
    /// Username único do utilizador.
    /// </summary>
    public string UserName { get; set; } = default!;

    /// <summary>
    /// URL ou data URI da foto de perfil.
    /// </summary>
    public string ProfilePictureUrl { get; set; } = default!;

    /// <summary>
    /// Localização geográfica.
    /// </summary>
    public string? Location { get; set; } = default!;

    /// <summary>
    /// Número de telefone.
    /// </summary>
    public string PhoneNumber { get; set; } = default!;

    /// <summary>
    /// Biografia ou descrição pessoal.
    /// </summary>
    public string? Bio { get; set; }

    /// <summary>
    /// Fuso horário preferido (formato IANA).
    /// </summary>
    public string? Timezone { get; set; }

    /// <summary>
    /// Data de criação da conta (UTC).
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Número de alterações de username restantes este mês (máx. 3).
    /// </summary>
    /// <remarks>
    /// Reseta automaticamente no início de cada mês.
    /// </remarks>
    public int UsernameChangesRemaining { get; set; }
}
