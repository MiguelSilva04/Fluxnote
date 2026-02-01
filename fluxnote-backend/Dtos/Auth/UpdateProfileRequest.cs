using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Auth;

/// <summary>
/// DTO para pedido de atualização de perfil de utilizador.
/// Usado no endpoint PUT /api/auth/users/me.
/// </summary>
/// <remarks>
/// <b>Comportamento:</b> Todos os campos são opcionais. Apenas campos não-nulos são atualizados.<br/>
/// <b>Limite de UserName:</b> Máximo 3 alterações por mês.
/// </remarks>
public class UpdateProfileRequest
{
    /// <summary>
    /// Nome completo do utilizador.
    /// </summary>
    /// <remarks>Validação: 2-100 caracteres.</remarks>
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Full name must be between 2 and 100 characters.")]
    public string? FullName { get; set; }

    /// <summary>
    /// URL ou data URI (base64) da foto de perfil.
    /// </summary>
    /// <remarks>
    /// Pode ser URL externa ou data URI base64.
    /// Limite: ~2MB para base64 (2.8M caracteres).
    /// </remarks>
    [StringLength(2800000, ErrorMessage = "Profile picture data is too large (max 2MB).")]
    public string? ProfilePictureUrl { get; set; }

    /// <summary>
    /// Localização geográfica do utilizador.
    /// </summary>
    /// <example>Lisboa, Portugal</example>
    [StringLength(100, ErrorMessage = "Location cannot exceed 100 characters.")]
    public string? Location { get; set; }

    /// <summary>
    /// Número de telefone em formato internacional.
    /// </summary>
    /// <example>+351912345678</example>
    [Phone(ErrorMessage = "Invalid phone number format.")]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Username único para identificação.
    /// </summary>
    /// <remarks>
    /// Validações: 3-30 caracteres, apenas letras, números e underscore.<br/>
    /// <b>⚠️ Limite:</b> Máximo 3 alterações por mês.
    /// </remarks>
    [StringLength(30, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 30 characters.")]
    [RegularExpression(@"^[a-zA-Z0-9_]+$", ErrorMessage = "Username can only contain letters, numbers, and underscores.")]
    public string? UserName { get; set; }

    /// <summary>
    /// Biografia ou descrição pessoal.
    /// </summary>
    [StringLength(500, ErrorMessage = "Bio cannot exceed 500 characters.")]
    public string? Bio { get; set; }

    /// <summary>
    /// Fuso horário preferido (formato IANA).
    /// </summary>
    /// <example>Europe/Lisbon</example>
    [StringLength(50, ErrorMessage = "Timezone cannot exceed 50 characters.")]
    public string? Timezone { get; set; }
}
