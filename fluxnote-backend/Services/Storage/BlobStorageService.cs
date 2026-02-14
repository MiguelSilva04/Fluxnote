using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;

namespace Fluxnote.Backend.Services.Storage;

/// <summary>
/// Implementação de IStorageService para produção usando Azure Blob Storage.
/// Faz upload de imagens para um container no Azure e retorna a URL pública.
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
}
