namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// DTO para listagem de documentos (sem conteúdo)
    /// </summary>
    public class DocumentDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int TeamId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public string CreatedById { get; set; } = string.Empty;
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
        
        /// <summary>
        /// Preview do texto (usado em pesquisas)
        /// </summary>
        public string? Preview { get; set; }
    }

    /// <summary>
    /// DTO para detalhes do documento (com conteúdo)
    /// </summary>
    public class DocumentDetailDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int TeamId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public string CreatedById { get; set; } = string.Empty;
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }

        /// <summary>
        /// Conteúdo HTML do documento
        /// </summary>
        public string? Content { get; set; }

        /// <summary>
        /// Texto limpo para preview
        /// </summary>
        public string? PlainText { get; set; }
    }
}
