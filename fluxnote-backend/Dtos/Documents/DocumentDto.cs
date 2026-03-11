namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// DTO leve para listagem de documentos (sem conteúdo).
    /// Usado na resposta do endpoint GET /api/documents.
    /// </summary>
    /// <remarks>
    /// <b>Uso:</b> Listagens onde não é necessário carregar o conteúdo completo.<br/>
    /// <b>Preview:</b> Incluído apenas quando há termo de pesquisa, mostrando contexto em torno do match.
    /// </remarks>
    public class DocumentDto
    {
        /// <summary>Identificador único do documento.</summary>
        public int Id { get; set; }

        /// <summary>Título do documento.</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>ID da equipa a que o documento pertence.</summary>
        public int TeamId { get; set; }

        /// <summary>Nome da equipa (denormalizado para evitar joins).</summary>
        public string TeamName { get; set; } = string.Empty;

        /// <summary>ID do utilizador que criou o documento.</summary>
        public string CreatedById { get; set; } = string.Empty;

        /// <summary>Nome do criador (denormalizado).</summary>
        public string CreatedByName { get; set; } = string.Empty;

        /// <summary>Data de criação do documento (UTC).</summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>Data da última modificação (UTC).</summary>
        public DateTime UpdatedAt { get; set; }

        /// <summary>Indica se o documento está na lixeira.</summary>
        public bool IsDeleted { get; set; }

        /// <summary>ID da pasta onde o documento está (null se solto).</summary>
        public int? FolderId { get; set; }

        /// <summary>Nome da pasta (null se solto).</summary>
        public string? FolderName { get; set; }

        /// <summary>
        /// Preview do texto com contexto em torno do termo pesquisado.
        /// </summary>
        /// <remarks>
        /// Apenas preenchido quando há parâmetro de pesquisa.<br/>
        /// Formato: "...texto antes [termo] texto depois..."
        /// </remarks>
        public string? Preview { get; set; }
    }

    /// <summary>
    /// DTO completo para detalhes de documento (com conteúdo).
    /// Usado na resposta dos endpoints GET/PUT /api/documents/{id}.
    /// </summary>
    /// <remarks>
    /// <b>Uso:</b> Quando é necessário exibir/editar o conteúdo do documento.<br/>
    /// <b>Conteúdo:</b> HTML armazenado convertido de bytes UTF-8 para string.
    /// </remarks>
    public class DocumentDetailDto
    {
        /// <summary>Identificador único do documento.</summary>
        public int Id { get; set; }

        /// <summary>Título do documento.</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>ID da equipa a que o documento pertence.</summary>
        public int TeamId { get; set; }

        /// <summary>Nome da equipa.</summary>
        public string TeamName { get; set; } = string.Empty;

        /// <summary>ID do utilizador criador.</summary>
        public string CreatedById { get; set; } = string.Empty;

        /// <summary>Nome do criador.</summary>
        public string CreatedByName { get; set; } = string.Empty;

        /// <summary>Data de criação (UTC).</summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>Data da última modificação (UTC).</summary>
        public DateTime UpdatedAt { get; set; }

        /// <summary>Indica se está na lixeira.</summary>
        public bool IsDeleted { get; set; }

        /// <summary>
        /// Conteúdo HTML completo do documento.
        /// </summary>
        /// <remarks>
        /// Convertido de bytes UTF-8 (armazenados como varbinary) para string.
        /// </remarks>
        public string? Content { get; set; }

        /// <summary>
        /// Texto plano extraído do HTML (sem tags).
        /// </summary>
        /// <remarks>
        /// Usado para pesquisa full-text e previews.
        /// </remarks>
        public string? PlainText { get; set; }

        /// <summary>
        /// Role efetiva do utilizador neste documento.
        /// </summary>
        /// <remarks>
        /// Valores possíveis: "Editor", "Viewer".
        /// Team Owners e TeamAdmins recebem sempre "Editor" (bypass à DocumentRole).
        /// Members recebem o valor do seu DocumentPermission (Editor ou Viewer).
        /// </remarks>
        public string Role { get; set; } = "Viewer";

        /// <summary>
        /// Indica se o utilizador autenticado é o Owner da equipa deste documento.
        /// Apenas o Owner pode restaurar versões. O Owner e o TeamAdmin podem resolver comentários. 
        /// </summary>
        public bool IsOwner { get; set; }

        /// <summary>
        /// Indica se o utilizador autenticado é um Team Admin da equipa deste documento.
        /// O Owner e o TeamAdmin podem resolver comentários.
        /// </summary>
        public bool IsTeamAdmin { get; set; }
    }
}
