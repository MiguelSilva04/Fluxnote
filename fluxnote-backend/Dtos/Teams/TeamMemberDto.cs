namespace Fluxnote.Backend.Dtos.Teams;

/// <summary>
/// DTO de pedido para atualização do role de um membro de equipa.
/// </summary>
public class UpdateTeamMemberRoleRequest
{
    /// <summary>
    /// Novo role a atribuir ao membro.
    /// </summary>
    /// <remarks>Valores válidos: 0=Member, 1=TeamAdmin.</remarks>
    public int Role { get; set; }
}

/// <summary>
/// DTO de pedido para criação de um novo membro de equipa.
/// </summary>
public class CreateTeamMemberRequest
{
    /// <summary>Nome de exibição do membro na equipa.</summary>
    public string? Name { get; set; }

    /// <summary>Role do membro na equipa (0=Member, 1=TeamAdmin, 2=Owner).</summary>
    public int Role { get; set; }

    /// <summary>ID da equipa alvo para adicionar o membro.</summary>
    public int? TeamId { get; set; }

    /// <summary>ID do utilizador a adicionar.</summary>
    public string? UserId { get; set; }

    /// <summary>Email do utilizador a adicionar (quando aplicável).</summary>
    public string? Email { get; set; }
}
