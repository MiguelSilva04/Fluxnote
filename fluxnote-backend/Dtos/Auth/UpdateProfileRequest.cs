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
}
