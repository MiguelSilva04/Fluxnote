namespace Fluxnote.Backend.Services.Email;

/// <summary>
/// Interface para serviços de envio de email.
/// </summary>
/// <remarks>
/// <b>Implementações disponíveis:</b>
/// <list type="bullet">
///     <item><description><see cref="ConsoleEmailSender"/>: Desenvolvimento - escreve para consola e armazena em memória</description></item>
///     <item><description><see cref="SmtpEmailSender"/>: Produção - envia via SMTP usando MailKit</description></item>
/// </list>
/// <b>Configuração em Program.cs:</b>
/// <code>
/// if (env.IsDevelopment())
///     services.AddScoped&lt;IEmailSender, ConsoleEmailSender&gt;();
/// else
///     services.AddScoped&lt;IEmailSender, SmtpEmailSender&gt;();
/// </code>
/// </remarks>
public interface IEmailSender
{
    /// <summary>
    /// Envia um email de confirmação de conta para um utilizador.
    /// </summary>
    /// <param name="toEmail">Endereço de email do destinatário.</param>
    /// <param name="confirmationLink">URL completo do link de confirmação.</param>
    /// <returns>Task que completa quando o email é enviado (ou simulado).</returns>
    /// <remarks>
    /// O link deve apontar para o frontend, que depois chama o endpoint /auth/confirm-email.<br/>
    /// Formato típico: {FrontendBaseUrl}/confirm-email?userId={id}&amp;token={encodedToken}
    /// </remarks>
    Task SendEmailConfirmationAsync(string toEmail, string confirmationLink, string lang = "en");

    /// <summary>
    /// Envia um email de recuperação de password para um utilizador.
    /// </summary>
    /// <param name="toEmail">Endereço de email do destinatário.</param>
    /// <param name="resetLink">URL completo do link de reset de password.</param>
    /// <param name="lang">Idioma do email ("en" ou "pt"). Por defeito "en".</param>
    /// <returns>Task que completa quando o email é enviado (ou simulado).</returns>
    /// <remarks>
    /// O link deve apontar para o frontend, que depois chama o endpoint /auth/reset-password.<br/>
    /// Formato típico: {FrontendBaseUrl}/reset-password?userId={id}&amp;token={encodedToken}
    /// </remarks>
    Task SendPasswordResetAsync(string toEmail, string resetLink, string lang = "en");
}
