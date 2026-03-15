using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Auth;

/// <summary>
/// DTO para definir uma password local numa conta autenticada externamente.
/// </summary>
public class SetPasswordRequest
{
    /// <summary>
    /// Nova password da conta.
    /// </summary>
    /// <remarks>
    /// Regras: mínimo de 8 caracteres e máximo de 100.
    /// </remarks>
    [Required(ErrorMessage = "New password is required.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters long.")]
    public string NewPassword { get; set; } = string.Empty;
}

