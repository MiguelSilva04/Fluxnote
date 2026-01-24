using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models;

public class RefreshToken
{
    public int Id { get; set; }
    [Required]
    [MaxLength(128)] // ajustar conforme base64/hex, 128 dá folga
    public string TokenHash { get; set; } = default!;
    
    [Required]
    public string UserId { get; set; } = default!;
    public User User { get; set; } = default!;

    [Required]
    public string SessionId { get; set; } = default!; // GUID para identificar a sessão
    public DateTime SessionStartedAt { get; set; } // quando a sessão foi iniciada (max 30 dias)
    public DateTime LastUsedAt { get; set; } // máximo de 7 dias sem uso

    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedByIp { get; set; }

    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool isExpired => DateTime.UtcNow >= ExpiresAt;
    public bool isRevoked => RevokedAt != null;
    public bool isActive => RevokedAt == null && !isExpired;
}