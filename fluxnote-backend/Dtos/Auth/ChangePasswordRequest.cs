using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Auth;

/// <summary>
/// DTO para pedido de alteração de password.
/// Usado no endpoint PUT /api/auth/users/me/password.
/// </summary>
/// <remarks>
/// <b>Validações:</b>
/// <list type="bullet">
///     <item><description>CurrentPassword: Obrigatório</description></item>
///     <item><description>NewPassword: Obrigatório, 6-100 caracteres</description></item>
///     <item><description>ConfirmPassword: Obrigatório, deve coincidir com NewPassword</description></item>
/// </list>
/// <b>Nota:</b> Requisitos adicionais de password (maiúscula, minúscula, dígito, especial)
/// são aplicados pelo ASP.NET Core Identity.
/// </remarks>
public class ChangePasswordRequest
{
    /// <summary>
    /// Password atual do utilizador para verificação de segurança.
    /// </summary>
    [Required(ErrorMessage = "Current password is required.")]
    public string CurrentPassword { get; set; } = default!;

    /// <summary>
    /// Nova password pretendida.
    /// </summary>
    /// <remarks>
    /// Requisitos do Identity: 8+ caracteres, maiúscula, minúscula, dígito, especial.
    /// </remarks>
    [Required(ErrorMessage = "New password is required.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters long.")]
    public string NewPassword { get; set; } = default!;

    /// <summary>
    /// Confirmação da nova password (deve ser igual a NewPassword).
    /// </summary>
    [Required(ErrorMessage = "Password confirmation is required.")]
    [Compare("NewPassword", ErrorMessage = "Passwords do not match.")]
    public string ConfirmPassword { get; set; } = default!;
}
