using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.DocumentInvites;

/// <summary>
/// DTO de pedido para criação de convite de acesso a um documento.
/// </summary>
public class CreateDocumentInviteRequest
{
    /// <summary>
    /// ID do documento para o qual o convite será criado.
    /// </summary>
    [Required]
    public int DocumentId { get; set; }
    /// <summary>
    /// Role a ser atribuído ao utilizador convidado ao aceitar o convite. 
    /// 0 = Viewer, 1 = Editor.
    /// </summary>
    [Required]
    public int Role { get; set; }
    /// <summary>
    /// Dias até o convite expirar. Após esse período, o convite não poderá mais ser aceito.
    /// Por padrão, o convite expira em 7 dias. O valor deve ser um inteiro positivo.
    /// </summary>
    public int ExpirationDays { get; set; } = 7;
}
