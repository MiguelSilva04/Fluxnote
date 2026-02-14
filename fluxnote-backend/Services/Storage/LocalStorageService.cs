using Microsoft.AspNetCore.Hosting;

namespace Fluxnote.Backend.Services.Storage;

/// <summary>
/// Implementação de IStorageService para desenvolvimento.
/// Guarda imagens localmente em wwwroot/uploads/ e retorna URL relativa
/// servida pelo UploadsController (GET /api/uploads/images/{fileName}).
/// </summary>
public class LocalStorageService : IStorageService
{
    private readonly IWebHostEnvironment _env;

    public LocalStorageService(IWebHostEnvironment env)
    {
        _env = env;
    }

    public async Task<string> UploadImageAsync(Stream stream, string fileName, string contentType)
    {
        var uploadsPath = Path.Combine(
            _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"),
            "uploads");

        Directory.CreateDirectory(uploadsPath);

        var extension = Path.GetExtension(fileName);
        var uniqueName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsPath, uniqueName);

        using var fileStream = new FileStream(filePath, FileMode.Create);
        await stream.CopyToAsync(fileStream);

        // URL relativa que passa pelo proxy do Angular (/api/*)
        return $"/api/uploads/images/{uniqueName}";
    }
}
