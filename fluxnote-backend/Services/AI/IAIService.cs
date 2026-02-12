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
    }
}
