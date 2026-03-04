using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Fluxnote.Backend.Services.AI
{
    /// <summary>
    /// Implementação do serviço de IA usando Google Gemini API (free tier).
    /// </summary>
    /// <remarks>
    /// Free tier: 15 RPM, 1M tokens/dia com gemini-2.0-flash.
    /// Documentação: https://ai.google.dev/gemini-api/docs
    /// </remarks>
    public class GeminiAIService : IAIService
    {
        private readonly HttpClient _httpClient;
        private readonly GeminiOptions _options;
        private readonly ILogger<GeminiAIService> _logger;

        public GeminiAIService(HttpClient httpClient, IOptions<GeminiOptions> options, ILogger<GeminiAIService> logger)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<string> GenerateSummaryAsync(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return "The document is empty. There is no content to summarize.";

            // Limitar o texto a ~8000 caracteres para não exceder tokens
            var truncatedText = text.Length > 8000 ? text[..8000] + "..." : text;

            var prompt = $@"You are a helpful assistant that creates concise document summaries. 
Analyze the following document text and generate a clear, well-structured summary.
The summary should:
- Be written in the same language as the document
- Highlight the key points and main ideas
- Be between 3 to 8 sentences long
- Use a professional tone

Document text:
---
{truncatedText}
---

Summary:";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = prompt }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.3,
                    maxOutputTokens = 2048
                }
            };

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_options.Model}:generateContent?key={_options.ApiKey}";

            try
            {
                var json = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(url, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Gemini API error: {StatusCode} - {Body}", response.StatusCode, responseBody);

                    if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                        throw new InvalidOperationException("Rate limit exceeded. Please wait a moment and try again.");

                    throw new Exception($"AI service returned error: {response.StatusCode}");
                }

                // Parse da resposta do Gemini
                using var doc = JsonDocument.Parse(responseBody);
                var candidates = doc.RootElement.GetProperty("candidates");
                var firstCandidate = candidates[0];

                // Log do finishReason para debug
                if (firstCandidate.TryGetProperty("finishReason", out var finishReason))
                {
                    _logger.LogInformation("Gemini finishReason: {FinishReason}", finishReason.GetString());
                }

                // Juntar todas as parts (a API pode devolver o texto fragmentado)
                var parts = firstCandidate.GetProperty("content").GetProperty("parts");
                var sb = new StringBuilder();
                foreach (var part in parts.EnumerateArray())
                {
                    if (part.TryGetProperty("text", out var textProp))
                    {
                        sb.Append(textProp.GetString());
                    }
                }

                var summaryText = sb.ToString().Trim();
                return string.IsNullOrEmpty(summaryText) ? "Unable to generate summary." : summaryText;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to parse Gemini API response");
                throw new Exception("Failed to parse AI response.");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Failed to connect to Gemini API");
                throw new Exception("Failed to connect to AI service.");
            }
        }

        /// <inheritdoc />
        public async Task<string> ImproveTextAsync(string selectedText, string fullDocumentText, IEnumerable<string>? contextTexts = null)
        {
            if (string.IsNullOrWhiteSpace(selectedText))
                return "No text selected to improve.";

            // Limitar o documento a ~6000 caracteres para deixar espaço ao contexto
            var truncatedDoc = fullDocumentText.Length > 6000 ? fullDocumentText[..6000] + "..." : fullDocumentText;

            // Construir bloco de contexto adicional (ficheiros de contexto)
            var contextBlock = "";
            if (contextTexts != null)
            {
                var combined = string.Join("\n---\n", contextTexts.Where(t => !string.IsNullOrWhiteSpace(t)));
                if (!string.IsNullOrEmpty(combined))
                {
                    var truncatedContext = combined.Length > 3000 ? combined[..3000] + "..." : combined;
                    contextBlock = $@"

Additional context files provided by the user:
---
{truncatedContext}
---";
                }
            }

            var prompt = $@"You are a professional writing assistant that improves text quality.
You have access to the full document and optional context files to understand the tone, style, and subject matter.

Full document text:
---
{truncatedDoc}
---
{contextBlock}

The user has selected the following text to improve:
'''{selectedText}'''

Provide an improved version of ONLY the selected text. The improvement should:
- Maintain the same language as the original text
- Improve clarity, grammar, and readability
- Keep the same meaning and intent
- Match the tone and style of the rest of the document
- Be roughly the same length (not significantly longer or shorter)

Return ONLY the improved text, with no explanations, labels, or additional commentary.";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = prompt }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.4,
                    maxOutputTokens = 2048
                }
            };

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_options.Model}:generateContent?key={_options.ApiKey}";

            try
            {
                var json = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(url, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Gemini API error (improve): {StatusCode} - {Body}", response.StatusCode, responseBody);

                    if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                        throw new InvalidOperationException("Rate limit exceeded. Please wait a moment and try again.");

                    throw new Exception($"AI service returned error: {response.StatusCode}");
                }

                using var doc = JsonDocument.Parse(responseBody);
                var candidates = doc.RootElement.GetProperty("candidates");
                var firstCandidate = candidates[0];

                if (firstCandidate.TryGetProperty("finishReason", out var finishReason))
                {
                    _logger.LogInformation("Gemini finishReason (improve): {FinishReason}", finishReason.GetString());
                }

                var parts = firstCandidate.GetProperty("content").GetProperty("parts");
                var sb = new StringBuilder();
                foreach (var part in parts.EnumerateArray())
                {
                    if (part.TryGetProperty("text", out var textProp))
                    {
                        sb.Append(textProp.GetString());
                    }
                }

                var improvedText = sb.ToString().Trim();
                return string.IsNullOrEmpty(improvedText) ? "Unable to generate improvement." : improvedText;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to parse Gemini API response (improve)");
                throw new Exception("Failed to parse AI response.");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Failed to connect to Gemini API (improve)");
                throw new Exception("Failed to connect to AI service.");
            }
        }

        /// <inheritdoc />
        public async Task<string> GenerateContentAsync(string prompt, string fullDocumentText, IEnumerable<string>? contextTexts = null)
        {
            if (string.IsNullOrWhiteSpace(prompt))
                return "No prompt provided.";

            // Limitar o documento a ~6000 caracteres
            var truncatedDoc = fullDocumentText.Length > 6000 ? fullDocumentText[..6000] + "..." : fullDocumentText;

            // Construir bloco de contexto adicional (ficheiros de contexto)
            var contextBlock = "";
            if (contextTexts != null)
            {
                var combined = string.Join("\n---\n", contextTexts.Where(t => !string.IsNullOrWhiteSpace(t)));
                if (!string.IsNullOrEmpty(combined))
                {
                    var truncatedContext = combined.Length > 3000 ? combined[..3000] + "..." : combined;
                    contextBlock = $@"

Additional context files provided by the user:
---
{truncatedContext}
---";
                }
            }

            var systemPrompt = $@"You are a professional writing assistant that generates content for documents.
You have access to the full document and optional context files to understand the tone, style, and subject matter.

Full document text (for context):
---
{truncatedDoc}
---
{contextBlock}

The user requests the following content to be generated:
'''{prompt}'''

Generate the requested content. It should:
- Match the same language as the existing document (if the document is in Portuguese, write in Portuguese, etc.)
- Match the tone and style of the rest of the document
- Be well-structured and readable
- Be directly usable — do not include explanations, labels, or meta-commentary
- Use plain text only (no markdown formatting like #, **, etc.)

Return ONLY the generated content, ready to be inserted into the document.";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = systemPrompt }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.7,
                    maxOutputTokens = 4096
                }
            };

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_options.Model}:generateContent?key={_options.ApiKey}";

            try
            {
                var json = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(url, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Gemini API error (generate): {StatusCode} - {Body}", response.StatusCode, responseBody);

                    if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                        throw new InvalidOperationException("Rate limit exceeded. Please wait a moment and try again.");

                    throw new Exception($"AI service returned error: {response.StatusCode}");
                }

                using var doc = JsonDocument.Parse(responseBody);
                var candidates = doc.RootElement.GetProperty("candidates");
                var firstCandidate = candidates[0];

                if (firstCandidate.TryGetProperty("finishReason", out var finishReason))
                {
                    _logger.LogInformation("Gemini finishReason (generate): {FinishReason}", finishReason.GetString());
                }

                var parts = firstCandidate.GetProperty("content").GetProperty("parts");
                var sb = new StringBuilder();
                foreach (var part in parts.EnumerateArray())
                {
                    if (part.TryGetProperty("text", out var textProp))
                    {
                        sb.Append(textProp.GetString());
                    }
                }

                var generatedContent = sb.ToString().Trim();
                return string.IsNullOrEmpty(generatedContent) ? "Unable to generate content." : generatedContent;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to parse Gemini API response (generate)");
                throw new Exception("Failed to parse AI response.");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Failed to connect to Gemini API (generate)");
                throw new Exception("Failed to connect to AI service.");
            }
        }
    }
}
