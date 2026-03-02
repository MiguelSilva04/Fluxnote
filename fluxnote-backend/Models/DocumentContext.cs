using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models
{
    /// <summary>
    /// Representa um ficheiro de contexto associado a um documento para uso pela IA.
    /// O texto extraído é armazenado na BD para ser usado futuramente em prompts de geração de conteúdo.
    /// </summary>
    /// <remarks>
    /// Suporta ficheiros PDF e TXT. A estrutura é extensível para outros formatos.
    /// O ficheiro em si é guardado via IStorageService (local em dev, Azure Blob em produção).
    /// O ExtractedText não é exposto ao frontend, é exclusivamente usado server-side pela IA.
    /// </remarks>
    public class DocumentContext
    {
        /// <summary>
        /// Identificador único do contexto.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// ID do documento ao qual este contexto pertence (FK para Document).
        /// </summary>
        [Required]
        public int DocumentId { get; set; }

        /// <summary>
        /// Nome original do ficheiro carregado (ex: "notas.pdf").
        /// </summary>
        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        /// <summary>
        /// MIME type do ficheiro (ex: "application/pdf", "text/plain").
        /// Utilizado para determinar o método de extração de texto.
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string ContentType { get; set; } = string.Empty;

        /// <summary>
        /// Caminho ou referência ao ficheiro armazenado, retornado pelo IStorageService.
        /// Em dev: "local://context/{uniqueName}". Em produção: "blob://context/{blobName}".
        /// Usado para eliminar o ficheiro do storage quando o contexto for removido.
        /// </summary>
        [Required]
        [MaxLength(2048)]
        public string StoredPath { get; set; } = string.Empty;

        /// <summary>
        /// Texto extraído do ficheiro, pronto para ser incluído em prompts de IA.
        /// Null se a extração falhou ou o ficheiro estava vazio.
        /// Não é exposto ao frontend.
        /// </summary>
        public string? ExtractedText { get; set; }

        /// <summary>
        /// Tamanho do ficheiro em bytes.
        /// </summary>
        public long FileSizeBytes { get; set; }

        /// <summary>
        /// Data e hora do upload (UTC).
        /// </summary>
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// ID do utilizador que fez o upload (FK para User).
        /// </summary>
        [Required]
        public string UploadedById { get; set; } = string.Empty;

        // Propriedades de navegação
        public Document Document { get; set; } = null!;
        public User UploadedBy { get; set; } = null!;
    }
}
