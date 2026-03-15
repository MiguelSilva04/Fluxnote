using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models;

/// <summary>
/// Entidade que representa um convite por link para entrada numa equipa.
/// </summary>
public class TeamInvite
{
    /// <summary>
    /// Identificador único do convite (chave primária).
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Token único para o link do convite
    /// </summary>
    [Required]
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// Foreign Keys
    /// </summary>
    public int TeamId { get; set; }
    public int? CreatedByTeamMemberId { get; set; }

    /// <summary>
    /// Role a atribuir ao convidado ao aceitar o convite
    /// </summary>
    public TeamRole Role { get; set; } = TeamRole.Member;

    /// <summary>
    /// Metadata
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; } = false;

    /// <summary>
    /// Tracking de uso (null = não utilizado)
    /// </summary>
    public string? UsedByUserId { get; set; }

    /// <summary>
    /// Navigation properties
    /// </summary>
    public Team Team { get; set; } = null!;
    public TeamMember? CreatedBy { get; set; } = null!;
}

