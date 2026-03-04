namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// DTO para pedido de atualização de documento.
    /// Usado no endpoint PUT /api/documents/{id}.
    /// </summary>
    /// <remarks>
    /// <b>Comportamento:</b> Todos os campos são opcionais. Apenas campos não-nulos são atualizados.<br/>
    /// <b>Processamento de Conteúdo:</b>
    /// <list type="bullet">
    ///     <item><description>HTML é convertido para bytes UTF-8 e armazenado</description></item>
    ///     <item><description>PlainText é extraído automaticamente (tags HTML removidas)</description></item>
    ///     <item><description>UpdatedAt é atualizado para a hora atual</description></item>
    /// </list>
    /// </remarks>
    public class UpdateDocumentRequest
    {
        /// <summary>
        /// Novo título do documento.
        /// </summary>
        /// <remarks>Se null ou vazio, título mantém-se inalterado.</remarks>
        public string? Title { get; set; }

        /// <summary>
        /// Conteúdo HTML completo do documento.
        /// </summary>
        /// <remarks>
        /// Processamento ao guardar:
        /// <list type="bullet">
        ///     <item><description>Convertido para bytes UTF-8</description></item>
        ///     <item><description>Armazenado como varbinary(max)</description></item>
        ///     <item><description>PlainText extraído para pesquisa</description></item>
        /// </list>
        /// </remarks>
        public string? Content { get; set; }

        /// <summary>
        /// Snapshot Y.Doc (CRDT) codificado em Base64.
        /// </summary>
        /// <remarks>
        /// Enviado opcionalmente pelo cliente de colaboração para manter o snapshot
        /// sincronizado com o conteúdo HTML. Se null, o snapshot não é alterado.
        /// </remarks>
        public string? YDocSnapshot { get; set; }
    }
}
