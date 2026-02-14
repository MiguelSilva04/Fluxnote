namespace Fluxnote.Backend.Services.Storage;

public interface IStorageService
{
    Task<string> UploadImageAsync(Stream stream, string fileName, string contentType);
}
