using Microsoft.AspNetCore.Hosting;

namespace Fluxnote.Backend.Services.Storage;

/// <summary>
/// Implementação de IStorageService para desenvolvimento.
/// Guarda imagens localmente em wwwroot/uploads/ e retorna URL relativa
/// servida pelo UploadsController (GET /api/uploads/images/{fileName}).
/// Guarda ficheiros de contexto em wwwroot/context/
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

    public Task<(Stream? stream, string contentType)?> GetImageAsync(string fileName)
    {
        var uploadsPath = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var filePath = Path.Combine(uploadsPath, "uploads", fileName);

        if (!File.Exists(filePath))
            return Task.FromResult<(Stream? stream, string contentType)?>(null);

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var mime = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png"            => "image/png",
            ".gif"            => "image/gif",
            ".webp"           => "image/webp",
            _                 => "application/octet-stream"
        };

        Stream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<(Stream? stream, string contentType)?>((fs, mime));
    }

    public async Task<string> UploadContextFileAsync(Stream stream, string fileName, string contentType)
    {
        var contextPath = Path.Combine(
            _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"),
            "context");

        Directory.CreateDirectory(contextPath);

        var extension = Path.GetExtension(fileName);
        var uniqueName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(contextPath, uniqueName);

        using var fileStream = new FileStream(filePath, FileMode.Create);
        await stream.CopyToAsync(fileStream);

        // Referência interna — não exposta via HTTP (ficheiros de contexto são server-side only)
        return $"local://context/{uniqueName}";
    }

    public Task DeleteContextFileAsync(string storedPath)
    {
        const string prefix = "local://context/";
        if (!storedPath.StartsWith(prefix))
            return Task.CompletedTask;

        var fileName = Path.GetFileName(storedPath.Substring(prefix.Length));
        var filePath = Path.Combine(
            _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"),
            "context",
            fileName);

        if (File.Exists(filePath))
            File.Delete(filePath);

        return Task.CompletedTask;
    }
}
