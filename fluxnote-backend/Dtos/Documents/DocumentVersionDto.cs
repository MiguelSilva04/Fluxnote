namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// DTO leve para listagem de versões de um documento.
    /// Usado no endpoint GET /api/documents/{id}/versions.
    /// </summary>
    public class DocumentVersionDto
    {
        public int Id { get; set; }
        public int DocumentId { get; set; }
        public string AuthorName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string Summary { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO completo para visualização de uma versão específica.
    /// Inclui o conteúdo HTML para exibição em modo leitura.
    /// Usado no endpoint GET /api/documents/{id}/versions/{versionId}.
    /// </summary>
    public class DocumentVersionDetailDto : DocumentVersionDto
    {
        /// <summary>
        /// Conteúdo HTML da versão (extraído de Document.Content no momento da criação).
        /// Null se o documento não tinha conteúdo HTML guardado nesse momento.
        /// </summary>
        public string? ContentHtml { get; set; }
    }
}
