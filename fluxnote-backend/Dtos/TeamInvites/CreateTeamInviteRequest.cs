using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.TeamInvites;
public class CreateTeamInviteRequest
{
    /// <summary>
    /// ID da equipa para o qual o convite será criado.
    /// </summary>
    [Required]
    public int TeamId { get; set; }
    /// <summary>
    /// Role a ser atribuído ao usuário convidado ao aceitar o convite. 
    /// 0 = Member, 1 = TeamAdmin, 2 = Owner.
    /// </summary>
    [Required]
    public int Role { get; set; }
    /// <summary>
    /// Dias até o convite expirar. Após esse período, o convite não poderá mais ser aceito.
    /// Por padrão, o convite expira em 7 dias. O valor deve ser um inteiro positivo.
    /// </summary>
    public int ExpirationDays { get; set; } = 7;
}
