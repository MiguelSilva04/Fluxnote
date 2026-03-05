using Microsoft.Identity.Client;

namespace Fluxnote.Backend.Services.Email;

/// <summary>
/// Implementação de IEmailSender para ambiente de desenvolvimento.
/// Simula o envio de emails escrevendo para a consola e armazenando em memória.
/// </summary>
/// <remarks>
/// <b>⚠️ APENAS PARA DESENVOLVIMENTO</b><br/>
/// Esta implementação NÃO envia emails reais.
///
/// <b>Funcionalidades:</b>
/// <list type="bullet">
///     <item><description>Escreve o email e link para a consola</description></item>
///     <item><description>Armazena o link no DevEmailStore para acesso via API</description></item>
///     <item><description>Regista no logger para debugging</description></item>
/// </list>
///
/// <b>Recuperar Link de Confirmação:</b>
/// <code>GET /api/auth/dev/last-confirmation-link?email={email}</code>
///
/// <b>Registo em Program.cs:</b>
/// <code>services.AddScoped&lt;IEmailSender, ConsoleEmailSender&gt;();</code>
/// </remarks>
public class ConsoleEmailSender : IEmailSender
{
    private readonly ILogger<ConsoleEmailSender> _logger;
    private readonly IDevEmailStore _store;

    /// <summary>
    /// Construtor com injeção de dependências.
    /// </summary>
    /// <param name="logger">Logger para registo de atividade.</param>
    /// <param name="store">Armazenamento em memória para links de confirmação.</param>
    public ConsoleEmailSender(ILogger<ConsoleEmailSender> logger, IDevEmailStore store)
    {
        _logger = logger;
        _store = store;
    }

    /// <summary>
    /// Simula o envio de um email de confirmação.
    /// </summary>
    /// <param name="toEmail">Email destinatário.</param>
    /// <param name="confirmationLink">Link de confirmação.</param>
    /// <returns>Task completada imediatamente (não há operação async real).</returns>
    /// <remarks>
    /// <b>Output na Consola:</b>
    /// <code>
    /// [DEV EMAIL] To: user@example.com
    /// [DEV EMAIL] Link: http://localhost:4200/confirm-email?userId=...
    /// </code>
    /// </remarks>
    public Task SendEmailConfirmationAsync(string toEmail, string confirmationLink, string lang = "en")
    {
        _store.Save(toEmail, confirmationLink);
        Console.WriteLine($"[DEV EMAIL] To: {toEmail}");
        Console.WriteLine($"[DEV EMAIL] Link: {confirmationLink}");
        _logger.LogInformation("Simulated sending email to {ToEmail} with confirmation link: {ConfirmationLink}", toEmail, confirmationLink);
        return Task.CompletedTask;
    }

    /// <summary>
    /// Simula o envio de um email de recuperação de password.
    /// </summary>
    public Task SendPasswordResetAsync(string toEmail, string resetLink, string lang = "en")
    {
        _store.Save(toEmail, resetLink);
        Console.WriteLine($"[DEV EMAIL - PASSWORD RESET] To: {toEmail}");
        Console.WriteLine($"[DEV EMAIL - PASSWORD RESET] Link: {resetLink}");
        _logger.LogInformation("Simulated sending password reset email to {ToEmail} with link: {ResetLink}", toEmail, resetLink);
        return Task.CompletedTask;
    }
}

