namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// DTO para atualização de documento
    /// </summary>
    public class UpdateDocumentRequest
    {
        /// <summary>
        /// Novo título do documento (opcional)
        /// </summary>
        public string? Title { get; set; }

        /// <summary>
        /// Conteúdo HTML do documento (opcional)
        /// </summary>
        public string? Content { get; set; }
    }
}
