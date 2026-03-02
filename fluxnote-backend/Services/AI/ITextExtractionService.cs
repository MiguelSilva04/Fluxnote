namespace Fluxnote.Backend.Services.AI;

/// <summary>
/// Serviço para extração de texto plano de ficheiros carregados como contexto para a IA.
/// Suporta PDF e TXT;
/// </summary>
public interface ITextExtractionService
{
    /// <summary>
    /// Extrai texto plano de um stream de ficheiro.
    /// </summary>
    /// <param name="stream">Conteúdo do ficheiro.</param>
    /// <param name="contentType">MIME type do ficheiro (ex: "application/pdf", "text/plain").</param>
    /// <returns>Texto extraído, ou null se o tipo não é suportado ou o ficheiro estava vazio.</returns>
    Task<string?> ExtractTextAsync(Stream stream, string contentType);

    /// <summary>
    /// Verifica se o contentType é suportado para extração de texto.
    /// </summary>
    bool IsSupported(string contentType);
}
