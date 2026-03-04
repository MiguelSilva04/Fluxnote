namespace Fluxnote.Backend.Services.Storage;

public interface IStorageService
{
    Task<string> UploadImageAsync(Stream stream, string fileName, string contentType);

    /// <summary>
    /// Devolve o stream de uma imagem previamente carregada, ou null se não existir.
    /// Usado pelo UploadsController para servir imagens sem depender de acesso anónimo ao blob.
    /// </summary>
    Task<(Stream? stream, string contentType)?> GetImageAsync(string fileName);

    /// <summary>
    /// Faz upload de um ficheiro de contexto e retorna uma referência de armazenamento.
    /// Em dev: "local://context/{uniqueName}". Em produção: "blob://context/{blobName}".
    /// O ficheiro não é servido via HTTP — é apenas usado server-side pela IA.
    /// </summary>
    Task<string> UploadContextFileAsync(Stream stream, string fileName, string contentType);

    /// <summary>
    /// Elimina um ficheiro de contexto previamente armazenado.
    /// </summary>
    /// <param name="storedPath">A referência retornada pelo UploadContextFileAsync.</param>
    Task DeleteContextFileAsync(string storedPath);
}
