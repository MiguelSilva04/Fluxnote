using Microsoft.AspNetCore.Identity;

namespace Fluxnote.Backend.Models
{
    public class User : IdentityUser
    {
        public string? FullName { get; set; }
        public string? Location { get; set; }
        public string? Bio { get; set; }
        public string? Timezone { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string? ProfilePictureUrl { get; set; }
        public AccountStatus AccountStatus { get; set; } = AccountStatus.Active;
        public AuthProvider AuthProvider { get; set; } = AuthProvider.Local;
        public ICollection<TeamMember> Teams { get; set; } = new List<TeamMember>();

        // Username change tracking (max 3 per month)
        public int UsernameChangesThisMonth { get; set; } = 0;
        public DateTime? LastUsernameChangeReset { get; set; }
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
        Blocked = 3
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
                AccountStatus.Blocked => "Blocked",
                _ => "Unknown"
            };
        }
    }
}
