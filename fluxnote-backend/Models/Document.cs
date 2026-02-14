using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models
{
    /// <summary>
    /// Representa um documento colaborativo no sistema Fluxnote.
    /// Os documentos pertencem a equipas e podem ser editados colaborativamente.
    /// </summary>
    /// <remarks>
    /// Funcionalidades principais:
    /// <list type="bullet">
    ///     <item><description>Armazenamento de conteúdo em formato binário (Y.Doc serializado)</description></item>
    ///     <item><description>Extração automática de texto plano para funcionalidade de pesquisa</description></item>
    ///     <item><description>Soft delete com possibilidade de restauração (lixeira)</description></item>
    ///     <item><description>Rastreamento de criador e timestamps de modificação</description></item>
    /// </list>
    /// Relacionamentos:
    /// <list type="bullet">
    ///     <item><description>N:1 com Team (cascade delete) - documento pertence a uma equipa</description></item>
    ///     <item><description>N:1 com User via CreatedById (restrict delete) - preserva referência ao criador</description></item>
    /// </list>
    /// Regras de Negócio:
    /// <list type="bullet">
    ///     <item><description>Limite de 10 documentos por utilizador no plano gratuito</description></item>
    ///     <item><description>Apenas o Owner da equipa pode criar documentos</description></item>
    ///     <item><description>Apenas o criador pode mover para lixeira e restaurar</description></item>
    ///     <item><description>Eliminação permanente só é possível para documentos na lixeira</description></item>
    /// </list>
    /// Armazenamento de Conteúdo:
    /// O campo Content armazena dados binários (varbinary(max) no SQL Server).
    /// O conteúdo HTML é convertido para UTF-8 bytes antes de guardar.
    /// O PlainText é extraído automaticamente do HTML para pesquisa.
    /// </remarks>
    public class Document
    {
        /// <summary>
        /// Identificador único do documento (chave primária).
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Título do documento (obrigatório, máx. 255 caracteres).
        /// </summary>
        /// <remarks>
        /// Usado na listagem e identificação visual do documento.
        /// </remarks>
        [Required(ErrorMessage = "O documento precisa de título")]
        [MaxLength(255)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Identificador da equipa proprietária (FK para Team).
        /// </summary>
        /// <remarks>
        /// Eliminação em cascata: remover equipa elimina todos os seus documentos.
        /// </remarks>
        public int TeamId { get; set; }

        /// <summary>
        /// Conteúdo binário do documento (Y.Doc serializado ou HTML em UTF-8).
        /// </summary>
        /// <remarks>
        /// Mapeado para varbinary(max) no SQL Server.
        /// O frontend envia HTML que é convertido para bytes UTF-8.
        /// Pode conter dados de editores colaborativos (ex: Yjs).
        /// </remarks>
        public byte[]? Content { get; set; }

        /// <summary>
        /// Texto extraído do conteúdo para pesquisa full-text.
        /// </summary>
        /// <remarks>
        /// Gerado automaticamente ao guardar, removendo tags HTML.
        /// Permite pesquisa eficiente sem processar binário.
        /// </remarks>
        public string? PlainText { get; set; }

        /// <summary>
        /// Data e hora de criação do documento (UTC).
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Data e hora da última modificação (UTC).
        /// </summary>
        /// <remarks>
        /// Atualizado automaticamente em cada edição de conteúdo ou título.
        /// </remarks>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Identificador do utilizador que criou o documento (FK para User).
        /// </summary>
        /// <remarks>
        /// Deve ser o Owner da equipa no momento da criação.<br/>
        /// Restrict delete: não permite eliminar utilizador com documentos.
        /// </remarks>
        [Required]
        public string CreatedById { get; set; } = string.Empty;

        /// <summary>
        /// Indica se o documento está na lixeira (soft delete).
        /// </summary>
        /// <remarks>
        /// Documentos com IsDeleted=true não aparecem em listagens normais.
        /// Podem ser restaurados via endpoint /restore.
        /// </remarks>
        public bool IsDeleted { get; set; } = false;

        /// <summary>
        /// Data e hora em que o documento foi movido para a lixeira.
        /// </summary>
        /// <remarks>
        /// Null se o documento não estiver na lixeira.
        /// Pode ser usado para eliminação automática após período X.
        /// </remarks>
        public DateTime? DeletedAt { get; set; }

        /// <summary>
        /// Identificador da pasta onde o documento está organizado (opcional).
        /// Null indica que o documento não está em nenhuma pasta.
        /// </summary>
        public int? FolderId { get; set; }

        /// <summary>
        /// Referência de navegação para a equipa proprietária.
        /// </summary>
        public Team Team { get; set; } = null!;

        /// <summary>
        /// Referência de navegação para a pasta (opcional).
        /// </summary>
        public Folder? Folder { get; set; }

        /// <summary>
        /// Referência de navegação para o utilizador criador.
        /// </summary>
        public User CreatedBy { get; set; } = null!;
        
        // Coleção de permissões
        public ICollection<DocumentPermission> Permissions { get; set; } = new List<DocumentPermission>();

    }
}
