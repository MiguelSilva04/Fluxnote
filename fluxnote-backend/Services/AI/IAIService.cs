namespace Fluxnote.Backend.Services.AI
{
    /// <summary>
    /// Interface para o serviço de IA generativa.
    /// </summary>
    public interface IAIService
    {
        /// <summary>
        /// Gera um resumo a partir do texto fornecido.
        /// </summary>
        /// <param name="text">Texto plano do documento.</param>
        /// <returns>Resumo gerado pela LLM.</returns>
        Task<string> GenerateSummaryAsync(string text);

        /// <summary>
        /// Sugere melhorias para o texto selecionado, tendo em conta o contexto do documento.
        /// </summary>
        /// <param name="selectedText">Texto selecionado pelo utilizador.</param>
        /// <param name="fullDocumentText">Texto completo do documento para contexto.</param>
        /// <param name="contextTexts">Textos extraídos dos ficheiros de contexto (opcional).</param>
        /// <returns>Texto melhorado sugerido pela LLM.</returns>
        Task<string> ImproveTextAsync(string selectedText, string fullDocumentText, IEnumerable<string>? contextTexts = null);

        /// <summary>
        /// Gera conteúdo novo com base num prompt do utilizador, tendo em conta o documento e ficheiros de contexto.
        /// </summary>
        /// <param name="prompt">Instrução do utilizador (o que quer gerar).</param>
        /// <param name="fullDocumentText">Texto completo do documento para contexto.</param>
        /// <param name="contextTexts">Textos extraídos dos ficheiros de contexto (opcional).</param>
        /// <returns>Conteúdo gerado pela LLM.</returns>
        Task<string> GenerateContentAsync(string prompt, string fullDocumentText, IEnumerable<string>? contextTexts = null);
    }
}
