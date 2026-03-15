namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// DTO para representar um ficheiro de contexto associado a um documento.
    /// devolvido nos endpoints GET e POST de contexto.
    /// O ExtractedText não é exposto - é exclusivamente usado server-side pela IA.
    /// </summary>
    public class DocumentContextDto
    {
        public int Id { get; set; }
        public int DocumentId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
        public DateTime UploadedAt { get; set; }
        public string UploadedByName { get; set; } = string.Empty;

        /// <summary>
        /// Indicador de se o ficheiro tem texto extraído. True significa que o texto foi extraído com sucesso e está disponível para análise pela IA.
        /// False pode indicar um PDF sem texto selecionável ou um ficheiro de imagem onde a extração falhou.
        /// </summary>
        public bool HasExtractedText { get; set; }
    }
}
