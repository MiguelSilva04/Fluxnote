using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models;

public class DocumentInvite
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
    public int DocumentId { get; set; }
    [Required]
    public int CreatedByTeamMemberId { get; set; }

    /// <summary>
    /// Role a atribuir ao convidado ao aceitar o convite
    /// </summary>
    public DocumentRole Role { get; set; } = DocumentRole.Viewer;

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
    public Document Document { get; set; } = null!;
    public TeamMember CreatedBy { get; set; } = null!;
}

