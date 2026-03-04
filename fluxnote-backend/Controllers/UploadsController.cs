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

    public UploadsController(IStorageService storageService)
    {
        _storageService = storageService;
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
    /// Serve imagens — em dev a partir do sistema de ficheiros local,
    /// em produção via proxy ao Azure Blob Storage (sem necessidade de acesso anónimo ao blob).
    /// </summary>
    [HttpGet("images/{fileName}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetImage(string fileName)
    {
        // Sanitizar o nome do ficheiro para prevenir path traversal
        fileName = Path.GetFileName(fileName);
        if (string.IsNullOrEmpty(fileName))
            return BadRequest();

        var result = await _storageService.GetImageAsync(fileName);
        if (result is null)
            return NotFound();

        var (stream, contentType) = result.Value;
        return File(stream!, contentType, enableRangeProcessing: false);
    }
}
