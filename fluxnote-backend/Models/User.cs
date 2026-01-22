using Microsoft.AspNetCore.Identity;

namespace Fluxnote.Backend.Models
{
    public class User : IdentityUser
    {
        public string? FullName { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string? ProfilePictureUrl { get; set; }
        public AccountStatus AccountStatus { get; set; } = AccountStatus.Active;
        public AuthProvider AuthProvider { get; set; } = AuthProvider.Local;
    }

    public enum AuthProvider
    {
        Local = 0,
        Google = 1,
        Microsoft = 2
    }

    public static class AuthProviderExtensions
    {
        public static string ToDisplayString(this AuthProvider provider)
        {
            return provider switch
            {
                AuthProvider.Local => "Local",
                AuthProvider.Google => "Google",
                AuthProvider.Microsoft => "Microsoft",
                _ => "Unknown"
            };
        }
    }

    public enum AccountStatus
    {
        PendingEmailConfirmation = 0,
        Active = 1,
        Suspended = 2,
        Deleted = 3
    }

    public static class AccountStatusExtensions
    {
        public static string ToDisplayString(this AccountStatus status)
        {
            return status switch
            {
                AccountStatus.PendingEmailConfirmation => "Pending Email Confirmation",
                AccountStatus.Active => "Active",
                AccountStatus.Suspended => "Suspended",
                AccountStatus.Deleted => "Deleted",
                _ => "Unknown"
            };
        }
    }
}
