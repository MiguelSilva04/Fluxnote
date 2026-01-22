using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models;

public class RefreshToken
{
    public int Id { get; set; }
    [Required]
    [MaxLength(64)] // SHA-256 hash length in hex
    public string TokenHash { get; set; } = default!;
    
    [Required]
    public string UserId { get; set; } = default!;
    public User User { get; set; } = default!;

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedByIp { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool isExpired => DateTime.UtcNow >= ExpiresAt;
    public bool isRevoked => RevokedAt != null;
    public bool isActive => RevokedAt == null && !isExpired;
}