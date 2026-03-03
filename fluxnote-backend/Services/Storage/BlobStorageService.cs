using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;

namespace Fluxnote.Backend.Services.Storage;

/// <summary>
/// Implementação de IStorageService para produção usando Azure Blob Storage.
/// Imagens: container público, URL direta. Contexto: container privado, referência interna.
/// </summary>
public class BlobStorageService : IStorageService
{
    private readonly BlobStorageOptions _options;

    public BlobStorageService(IOptions<BlobStorageOptions> options)
    {
        _options = options.Value;
    }

    public async Task<string> UploadImageAsync(Stream stream, string fileName, string contentType)
    {
        var client = new BlobServiceClient(_options.ConnectionString);
        var container = client.GetBlobContainerClient(_options.ContainerName);
        await container.CreateIfNotExistsAsync(PublicAccessType.Blob);

        var extension = Path.GetExtension(fileName);
        var blobName = $"{Guid.NewGuid()}{extension}";

        var blobClient = container.GetBlobClient(blobName);
        var headers = new BlobHttpHeaders { ContentType = contentType };

        await blobClient.UploadAsync(stream, new BlobUploadOptions { HttpHeaders = headers });

        return blobClient.Uri.ToString();
    }

    public async Task<string> UploadContextFileAsync(Stream stream, string fileName, string contentType)
    {
        var client = new BlobServiceClient(_options.ConnectionString);
        // Container separado e privado para ficheiros de contexto
        var container = client.GetBlobContainerClient(_options.ContextContainerName);
        await container.CreateIfNotExistsAsync(PublicAccessType.None);

        var extension = Path.GetExtension(fileName);
        var blobName = $"{Guid.NewGuid()}{extension}";

        var blobClient = container.GetBlobClient(blobName);
        var headers = new BlobHttpHeaders { ContentType = contentType };

        await blobClient.UploadAsync(stream, new BlobUploadOptions { HttpHeaders = headers });

        // Referência interna, não é uma URL pública
        return $"blob://context/{blobName}";
    }

    public async Task DeleteContextFileAsync(string storedPath)
    {
        const string prefix = "blob://context/";
        if (!storedPath.StartsWith(prefix))
            return;

        var blobName = storedPath.Substring(prefix.Length);

        var client = new BlobServiceClient(_options.ConnectionString);
        var container = client.GetBlobContainerClient(_options.ContextContainerName);
        var blobClient = container.GetBlobClient(blobName);

        await blobClient.DeleteIfExistsAsync();
    }
}
