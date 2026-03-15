using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models;

/// <summary>
/// Entidade que representa uma permissão explícita de acesso de um membro a um documento.
/// </summary>
public class DocumentPermission
{
    /// <summary>Identificador único da permissão.</summary>
    public int Id { get; set; }

    /// <summary>ID do documento ao qual a permissão pertence.</summary>
    [Required]
    public int DocumentId { get; set; } = default!;

    /// <summary>ID do membro da equipa a quem a permissão foi atribuída.</summary>
    [Required]
    public int TeamMemberId { get; set; } = default!;

    /// <summary>Role no documento.</summary>
    public DocumentRole Role { get; set; } = DocumentRole.Viewer;
    
    /// <summary>Data de criação da permissão (UTC).</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Data da última atualização da permissão (UTC).</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>Documento associado à permissão.</summary>
    public Document Document { get; set; } = null!;

    /// <summary>Membro da equipa associado à permissão.</summary>
    public TeamMember TeamMember { get; set; } = null!;
}
