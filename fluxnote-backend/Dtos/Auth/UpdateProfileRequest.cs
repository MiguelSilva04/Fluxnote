using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Auth;

public class UpdateProfileRequest
{
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Full name must be between 2 and 100 characters.")]
    public string? FullName { get; set; }

    [StringLength(500, ErrorMessage = "Profile picture URL cannot exceed 500 characters.")]
    [Url(ErrorMessage = "Profile picture must be a valid URL.")]
    public string? ProfilePictureUrl { get; set; }

    [StringLength(100, ErrorMessage = "Location cannot exceed 100 characters.")]
    public string? Location { get; set; }

    [Phone(ErrorMessage = "Invalid phone number format.")]
    public string? PhoneNumber { get; set; }

    [StringLength(30, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 30 characters.")]
    [RegularExpression(@"^[a-zA-Z0-9_]+$", ErrorMessage = "Username can only contain letters, numbers, and underscores.")]
    public string? UserName { get; set; }

    [StringLength(500, ErrorMessage = "Bio cannot exceed 500 characters.")]
    public string? Bio { get; set; }

    [StringLength(50, ErrorMessage = "Timezone cannot exceed 50 characters.")]
    public string? Timezone { get; set; }
}
