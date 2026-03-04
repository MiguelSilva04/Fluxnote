using Fluxnote.Backend.Services.Storage;

namespace Fluxnote.Backend.Tests.Fakes;

/// <summary>
/// Fake de IStorageService para testes de integração.
/// Simula uploads e eliminações sem gravar ficheiros reais em disco ou Blob.
/// </summary>
public class TestStorageService : IStorageService
{
    /// <summary>
    /// Caminhos de ficheiros de contexto carregados (para assertions).
    /// </summary>
    public List<string> UploadedContextPaths { get; } = new();

    /// <summary>
    /// Caminhos de ficheiros de contexto eliminados (para assertions).
    /// </summary>
    public List<string> DeletedContextPaths { get; } = new();

    public Task<string> UploadImageAsync(Stream stream, string fileName, string contentType)
    {
        var fakePath = $"/api/uploads/images/{Guid.NewGuid()}{Path.GetExtension(fileName)}";
        return Task.FromResult(fakePath);
    }

    public Task<string> UploadContextFileAsync(Stream stream, string fileName, string contentType)
    {
        var fakePath = $"local://context/{Guid.NewGuid()}{Path.GetExtension(fileName)}";
        UploadedContextPaths.Add(fakePath);
        return Task.FromResult(fakePath);
    }

    public Task DeleteContextFileAsync(string storedPath)
    {
        DeletedContextPaths.Add(storedPath);
        return Task.CompletedTask;
    }

    public Task<(Stream? stream, string contentType)?> GetImageAsync(string fileName)
    {
        // Fake: devolve null (imagem não encontrada) por defeito
        return Task.FromResult<(Stream? stream, string contentType)?>(null);
    }

    /// <summary>
    /// Repõe o estado do fake para valores iniciais.
    /// </summary>
    public void Reset()
    {
        UploadedContextPaths.Clear();
        DeletedContextPaths.Clear();
    }
}
