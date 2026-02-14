using Fluxnote.Backend.Services.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Fluxnote.Backend.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class UploadsController : ControllerBase
{
    private readonly IStorageService _storageService;
    private readonly IWebHostEnvironment _env;

    public UploadsController(IStorageService storageService, IWebHostEnvironment env)
    {
        _storageService = storageService;
        _env = env;
    }

    /// <summary>
    /// Faz upload de uma imagem e retorna a URL pública.
    /// </summary>
    [HttpPost("image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "File size exceeds 5MB limit." });

        if (!file.ContentType.StartsWith("image/"))
            return BadRequest(new { message = "Only image files are allowed." });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(new { message = "Allowed formats: JPEG, PNG, GIF, WebP." });

        using var stream = file.OpenReadStream();
        var url = await _storageService.UploadImageAsync(stream, file.FileName, file.ContentType);

        return Ok(new { url });
    }

    /// <summary>
    /// Serve imagens guardadas localmente (apenas em Development).
    /// Em produção, as imagens são servidas diretamente pelo Azure Blob Storage.
    /// </summary>
    [HttpGet("images/{fileName}")]
    [AllowAnonymous]
    public IActionResult GetImage(string fileName)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        // Sanitizar o nome do ficheiro para prevenir path traversal
        fileName = Path.GetFileName(fileName);

        var uploadsPath = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var filePath = Path.Combine(uploadsPath, "uploads", fileName);

        if (!System.IO.File.Exists(filePath))
            return NotFound();

        var contentType = GetContentType(fileName);
        return PhysicalFile(filePath, contentType);
    }

    private static string GetContentType(string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
    }
}
