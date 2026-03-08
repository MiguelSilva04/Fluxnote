using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Auth;

/// <summary>
/// DTO para pedido de recuperação de password.
/// </summary>
public class ForgotPasswordRequest
{
    /// <summary>Email do utilizador que pretende recuperar a password.</summary>
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = string.Empty;

    /// <summary>Idioma preferido para o email ("en" ou "pt").</summary>
    public string Lang { get; set; } = "en";
}
