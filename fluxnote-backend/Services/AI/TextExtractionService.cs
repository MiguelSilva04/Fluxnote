using System.Text;
using UglyToad.PdfPig;

namespace Fluxnote.Backend.Services.AI;

/// <summary>
/// Implementação de ITextExtractionService.
/// PDF: extração via PdfPig (MIT, pure C#, sem dependências nativas).
/// TXT: leitura direta como UTF-8.
/// </summary>
public class TextExtractionService : ITextExtractionService
{
    private static readonly HashSet<string> SupportedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "text/plain"
    };

    public bool IsSupported(string contentType) => SupportedTypes.Contains(contentType);

    public async Task<string?> ExtractTextAsync(Stream stream, string contentType)
    {
        return contentType.ToLowerInvariant() switch
        {
            "application/pdf" => await ExtractFromPdfAsync(stream),
            "text/plain"      => await ExtractFromTxtAsync(stream),
            _                 => null
        };
    }

    private static async Task<string?> ExtractFromTxtAsync(Stream stream)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        var text = await reader.ReadToEndAsync();
        return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
    }

    private static Task<string?> ExtractFromPdfAsync(Stream stream)
    {
        // PdfPig.Open aceita byte[], por isso copiamos o stream para memória
        byte[] bytes;
        if (stream is MemoryStream ms)
        {
            bytes = ms.ToArray();
        }
        else
        {
            using var buffer = new MemoryStream();
            stream.CopyTo(buffer);
            bytes = buffer.ToArray();
        }

        if (bytes.Length == 0)
            return Task.FromResult<string?>(null);

        using var pdf = PdfDocument.Open(bytes);
        var sb = new StringBuilder();

        foreach (var page in pdf.GetPages())
        {
            sb.AppendLine(page.Text);
        }

        var text = sb.ToString().Trim();
        return Task.FromResult<string?>(string.IsNullOrWhiteSpace(text) ? null : text);
    }
}
