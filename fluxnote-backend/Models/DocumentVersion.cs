using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models
{
    /// <summary>
    /// Representa uma versão imutável de um documento, criada quando um utilizador
    /// fecha a sessão de edição (desconexão do hub SignalR).
    /// </summary>
    public class DocumentVersion
    {
        /// <summary>Identificador único da versão.</summary>
        public int Id { get; set; }

        /// <summary>ID do documento ao qual pertence esta versão.</summary>
        public int DocumentId { get; set; }

        /// <summary>ID do utilizador que originou esta versão (quem saiu da sessão).</summary>
        [Required]
        public string AuthorId { get; set; } = string.Empty;

        /// <summary>Nome do autor (desnormalizado para exibição histórica).</summary>
        [MaxLength(255)]
        public string AuthorName { get; set; } = string.Empty;

        /// <summary>Data e hora de criação desta versão (UTC).</summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Resumo automático da versão (ex: "Session by João Silva").</summary>
        [MaxLength(500)]
        public string Summary { get; set; } = string.Empty;

        /// <summary>
        /// Snapshot binário do Y.Doc no momento da versão.
        /// Serializado via Y.encodeStateAsUpdate() no frontend.
        /// </summary>
        public byte[]? YDocSnapshot { get; set; }

        /// <summary>
        /// Conteúdo HTML do documento no momento da versão (UTF-8 bytes).
        /// Extraído de Document.Content para exibição em modo leitura.
        /// </summary>
        public byte[]? ContentHtml { get; set; }

        // ─── Navegação ───────────────────────────────────────────
        public Document Document { get; set; } = null!;
        public User Author { get; set; } = null!;
    }
}
