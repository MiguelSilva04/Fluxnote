using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Auth;

public class SetPasswordRequest
{
    [Required(ErrorMessage = "New password is required.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters long.")]
    public string NewPassword { get; set; } = string.Empty;
}

