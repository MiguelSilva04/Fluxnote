namespace Fluxnote.Backend.Dtos.Teams
{
    /// <summary>
    /// DTO completo de resposta de equipa.
    /// Usado na resposta dos endpoints GET /api/teams e GET /api/teams/{id}.
    /// </summary>
    /// <remarks>
    /// <b>Inclui:</b>
    /// <list type="bullet">
    ///     <item><description>Informação básica da equipa</description></item>
    ///     <item><description>Lista de membros com papéis</description></item>
    ///     <item><description>Lista de documentos (apenas não eliminados)</description></item>
    ///     <item><description>Papel do utilizador atual na equipa</description></item>
    /// </list>
    /// </remarks>
    public class TeamDto
    {
        /// <summary>Identificador único da equipa.</summary>
        public int Id { get; set; }

        /// <summary>Nome da equipa.</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>ID do TeamMember que é proprietário.</summary>
        public int OwnerId { get; set; }

        /// <summary>Data de criação da equipa (UTC).</summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>Data da última modificação (UTC).</summary>
        public DateTime UpdatedAt { get; set; }

        /// <summary>Indica se a equipa está ativa.</summary>
        public bool IsActive { get; set; }

        /// <summary>Data agendada para eliminação automática (se aplicável).</summary>
        public DateTime? DeletionScheduled { get; set; }

        /// <summary>
        /// Papel do utilizador autenticado nesta equipa.
        /// </summary>
        /// <remarks>
        /// Valores: 0=Member, 1=TeamAdmin, 2=Owner<br/>
        /// Permite ao frontend mostrar/esconder opções conforme permissões.
        /// </remarks>
        public int CurrentUserRole { get; set; }

        /// <summary>Lista de membros da equipa.</summary>
        public List<TeamMemberDto> Members { get; set; } = new();

        /// <summary>Lista de documentos da equipa (apenas não eliminados).</summary>
        public List<TeamDocumentDto> Documents { get; set; } = new();
    }

    /// <summary>
    /// DTO para membro de equipa em respostas.
    /// </summary>
    /// <remarks>
    /// Usado como item na lista Members de TeamDto.
    /// </remarks>
    public class TeamMemberDto
    {
        /// <summary>Identificador único do membro.</summary>
        public int Id { get; set; }

        /// <summary>Nome de exibição do membro na equipa.</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// ID do utilizador associado (pode ser null para convites pendentes).
        /// </summary>
        public string? UserId { get; set; }

        /// <summary>
        /// Papel na equipa como inteiro.
        /// </summary>
        /// <remarks>0=Member, 1=TeamAdmin, 2=Owner</remarks>
        public int Role { get; set; }

        /// <summary>Data em que o membro entrou na equipa (UTC).</summary>
        public DateTime JoinedAt { get; set; }
    }

    /// <summary>
    /// DTO leve para documento em contexto de equipa.
    /// </summary>
    /// <remarks>
    /// Usado como item na lista Documents de TeamDto.<br/>
    /// Contém apenas metadados, sem conteúdo do documento.
    /// </remarks>
    public class TeamDocumentDto
    {
        /// <summary>Identificador único do documento.</summary>
        public int Id { get; set; }

        /// <summary>Título do documento.</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>Data da última modificação (UTC).</summary>
        public DateTime UpdatedAt { get; set; }

        /// <summary>ID do utilizador que criou o documento.</summary>
        public string CreatedById { get; set; } = string.Empty;

        /// <summary>Lista de permissões do documento (apenas para Owner/TeamAdmin).</summary>
        public List<DocumentPermissionSummaryDto> Permissions { get; set; } = new();
    }

    public class DocumentPermissionSummaryDto
    {
        public int Id { get; set; }
        public int TeamMemberId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public int DocumentRole { get; set; } // 0=Viewer, 1=Editor
    }
}
