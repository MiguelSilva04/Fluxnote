using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Auth;

/// <summary>
/// DTO para redefinição de password com token.
/// </summary>
public class ResetPasswordRequest
{
    /// <summary>ID do utilizador.</summary>
    [Required(ErrorMessage = "User ID is required.")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>Token de reset codificado em Base64Url.</summary>
    [Required(ErrorMessage = "Token is required.")]
    public string Token { get; set; } = string.Empty;

    /// <summary>Nova password.</summary>
    [Required(ErrorMessage = "New password is required.")]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters.")]
    public string NewPassword { get; set; } = string.Empty;

    /// <summary>Confirmação da nova password.</summary>
    [Required(ErrorMessage = "Password confirmation is required.")]
    [Compare("NewPassword", ErrorMessage = "Passwords do not match.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
