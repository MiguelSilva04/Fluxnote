namespace Fluxnote.Backend.Services.AI
{
    /// <summary>
    /// Configuração para o serviço de IA (Google Gemini).
    /// Model definido em appsettings.json, ApiKey lida da variável de ambiente GEMINI_API_KEY.
    /// </summary>
    public class GeminiOptions
    {
        /// <summary>
        /// Chave de API do Google Gemini.
        /// Obter em: https://aistudio.google.com/apikey
        /// </summary>
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Modelo a utilizar.
        /// Recomendado: "gemini-2.5-flash" (gratuito, rápido, 1M tokens/dia).
        /// </summary>
        public string Model { get; set; } = "gemini-2.5-flash";
    }
}
