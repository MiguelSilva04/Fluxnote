using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models
{
    /// <summary>
    /// Representa a associação entre um utilizador e uma equipa.
    /// Define o papel/permissões do utilizador dentro da equipa.
    /// </summary>
    /// <remarks>
    /// Funcionalidades principais:
    /// <list type="bullet">
    ///     <item><description>Liga utilizadores a equipas com papéis específicos</description></item>
    ///     <item><description>Suporta membros sem conta (UserId nullable) para convites pendentes</description></item>
    ///     <item><description>Regista data de entrada na equipa</description></item>
    /// </list>
    /// Relacionamentos:
    /// <list type="bullet">
    ///     <item><description>N:1 com User (opcional) - membro pode estar associado a um utilizador</description></item>
    ///     <item><description>N:1 com Team - membro pertence a uma equipa</description></item>
    /// </list>
    /// Níveis de Permissão (TeamRole):
    /// <list type="bullet">
    ///     <item><description>Member (0): Visualizar e editar documentos da equipa</description></item>
    ///     <item><description>TeamAdmin (1): Gerir membros + permissões de Member</description></item>
    ///     <item><description>Owner (2): Controlo total, incluir criar/eliminar documentos e equipa</description></item>
    /// </list>
    /// </remarks>
    public class TeamMember
    {
        /// <summary>
        /// Identificador único do membro (chave primária).
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Nome de exibição do membro na equipa (obrigatório).
        /// </summary>
        /// <remarks>
        /// Pode ser diferente do FullName do User associado.
        /// Útil para personalização por equipa.
        /// </remarks>
        [Required]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Papel/nível de permissão do membro na equipa.
        /// </summary>
        /// <seealso cref="TeamRole"/>
        public TeamRole Role { get; set; }

        /// <summary>
        /// Identificador do utilizador associado (FK para User).
        /// </summary>
        /// <remarks>
        /// Nullable para suportar convites a utilizadores que ainda não têm conta.
        /// </remarks>
        public string? UserId { get; set; }

        /// <summary>
        /// Identificador da equipa a que pertence (FK para Team).
        /// </summary>
        public int? TeamId { get; set; }

        /// <summary>
        /// Data e hora em que o membro entrou na equipa (UTC).
        /// </summary>
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
        // Documentos a que este membro tem acesso
        public ICollection<DocumentPermission> DocumentPermissions { get; set; } = new List<DocumentPermission>();

    }

    /// <summary>
    /// Define os níveis de permissão disponíveis para membros de equipa.
    /// </summary>
    /// <remarks>
    /// Hierarquia de permissões (da mais baixa para mais alta):
    /// Member &lt; TeamAdmin &lt; Owner.
    /// Cada nível inclui todas as permissões dos níveis inferiores.
    /// </remarks>
    public enum TeamRole
    {
        /// <summary>
        /// Membro regular da equipa.
        /// </summary>
        /// <remarks>
        /// Permissões:
        /// <list type="bullet">
        ///     <item><description>Visualizar documentos da equipa</description></item>
        ///     <item><description>Editar documentos existentes</description></item>
        /// </list>
        /// </remarks>
        [Display(Name = "Member")]
        Member = 0,

        /// <summary>
        /// Administrador da equipa.
        /// </summary>
        /// <remarks>
        /// Permissões adicionais:
        /// <list type="bullet">
        ///     <item><description>Adicionar/remover membros</description></item>
        ///     <item><description>Alterar papéis de membros (exceto Owner)</description></item>
        /// </list>
        /// </remarks>
        [Display(Name = "Team Admin")]
        TeamAdmin = 1,

        /// <summary>
        /// Proprietário da equipa (criador ou transferido).
        /// </summary>
        /// <remarks>
        /// Permissões exclusivas:
        /// <list type="bullet">
        ///     <item><description>Criar novos documentos na equipa</description></item>
        ///     <item><description>Eliminar documentos</description></item>
        ///     <item><description>Eliminar a equipa</description></item>
        ///     <item><description>Transferir propriedade</description></item>
        ///     <item><description>Promover membros a TeamAdmin</description></item>
        /// </list>
        /// Apenas um Owner por equipa.
        /// </remarks>
        [Display(Name = "Owner")]
        Owner = 2
    }
}
