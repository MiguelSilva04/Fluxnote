using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using System.Net.Mail;
using SmtpClient = MailKit.Net.Smtp.SmtpClient;

namespace Fluxnote.Backend.Services.Email;

/// <summary>
/// Implementação de IEmailSender para produção usando SMTP.
/// Envia emails reais através de um servidor SMTP configurado.
/// </summary>
/// <remarks>
/// <b>Biblioteca:</b> MailKit (NuGet: MailKit)
///
/// <b>Configuração Necessária:</b>
/// <list type="bullet">
///     <item><description>EmailOptions configurado em appsettings.json</description></item>
///     <item><description>Servidor SMTP acessível (ex: smtp2go, SendGrid, Gmail)</description></item>
///     <item><description>Credenciais válidas para autenticação</description></item>
/// </list>
///
/// <b>Fluxo de Envio:</b>
/// <list type="number">
///     <item><description>Cria mensagem MIME com remetente e destinatário</description></item>
///     <item><description>Define assunto e corpo HTML</description></item>
///     <item><description>Conecta ao servidor SMTP com TLS</description></item>
///     <item><description>Autentica com credenciais</description></item>
///     <item><description>Envia mensagem</description></item>
///     <item><description>Desconecta</description></item>
/// </list>
///
/// <b>Registo em Program.cs:</b>
/// <code>services.AddScoped&lt;IEmailSender, SmtpEmailSender&gt;();</code>
/// </remarks>
public class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;

    /// <summary>
    /// Construtor com injeção de opções.
    /// </summary>
    /// <param name="options">Opções de configuração SMTP.</param>
    public SmtpEmailSender(IOptions<EmailOptions> options)
    {
        _options = options.Value;
    }

    /// <summary>
    /// Envia um email de confirmação de conta via SMTP.
    /// </summary>
    /// <param name="toEmail">Endereço de email do destinatário.</param>
    /// <param name="confirmationLink">URL completo do link de confirmação.</param>
    /// <returns>Task que completa quando o email é enviado.</returns>
    /// <remarks>
    /// <b>Conteúdo do Email:</b>
    /// <list type="bullet">
    ///     <item><description><b>Assunto:</b> "Confirm your email"</description></item>
    ///     <item><description><b>Corpo:</b> HTML com mensagem de boas-vindas e link de confirmação</description></item>
    /// </list>
    /// <b>Exceções Possíveis:</b>
    /// <list type="bullet">
    ///     <item><description>SocketException: Servidor SMTP inacessível</description></item>
    ///     <item><description>AuthenticationException: Credenciais inválidas</description></item>
    ///     <item><description>SmtpCommandException: Servidor rejeitou o email</description></item>
    /// </list>
    /// </remarks>
    public async Task SendEmailConfirmationAsync(string toEmail, string confirmationLink, string lang = "en")
    {
        var isPt = lang == "pt";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = isPt ? "Confirme o seu email" : "Confirm your email";

        var heading = isPt ? "Bem-vindo!" : "Welcome aboard!";
        var body = isPt
            ? "Obrigado por se juntar ao Fluxnote. Para começar, confirme o seu endereço de email clicando no botão abaixo."
            : "Thanks for joining Fluxnote. To get started, please confirm your email address by clicking the button below.";
        var btnText = isPt ? "Confirmar email" : "Confirm my email";
        var fallback = isPt
            ? "Se o botão não funcionar, copie e cole este link no seu browser:"
            : "If the button doesn't work, copy and paste this link into your browser:";
        var footer = isPt
            ? "Recebeu este email porque criou uma conta no Fluxnote.<br>Se não fez este pedido, pode ignorar esta mensagem."
            : "You received this email because you created a Fluxnote account.<br>If you didn't request this, you can safely ignore it.";
        var htmlLang = isPt ? "pt" : "en";

        var bodyHtml = $@"
<!DOCTYPE html>
<html lang=""{htmlLang}"">
<head>
  <meta charset=""UTF-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
</head>
<body style=""margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f3f4f6; padding:40px 0;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""480"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.07);"">
          <!-- Header -->
          <tr>
            <td style=""background-color:#155347; padding:32px 40px; text-align:center;"">
              <h1 style=""margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:-0.5px;"">Fluxnote</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style=""padding:40px;"">
              <h2 style=""margin:0 0 8px; color:#111827; font-size:22px; font-weight:600;"">{heading}</h2>
              <p style=""margin:0 0 24px; color:#6b7280; font-size:15px; line-height:1.6;"">
                {body}
              </p>
              <!-- Button -->
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td align=""center"" style=""padding:8px 0 32px;"">
                    <a href=""{confirmationLink}""
                       style=""display:inline-block; padding:14px 36px; background-color:#155347; color:#ffffff; text-decoration:none; font-size:15px; font-weight:600; border-radius:8px; letter-spacing:0.3px;"">
                      {btnText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style=""margin:0 0 16px; color:#9ca3af; font-size:13px; line-height:1.5;"">
                {fallback}
              </p>
              <p style=""margin:0; word-break:break-all; color:#155347; font-size:13px; line-height:1.5;"">
                {confirmationLink}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style=""padding:24px 40px; background-color:#f9fafb; border-top:1px solid #e5e7eb; text-align:center;"">
              <p style=""margin:0; color:#9ca3af; font-size:12px; line-height:1.5;"">
                {footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        message.Body = new BodyBuilder { HtmlBody = bodyHtml }.ToMessageBody();

        using var client = new SmtpClient();

        var secure = _options.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;

        await client.ConnectAsync(_options.SmtpHost, _options.SmtpPort, secure);
        await client.AuthenticateAsync(_options.SmtpUser, _options.SmtpPass);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    /// <summary>
    /// Envia um email de recuperação de password via SMTP.
    /// </summary>
    public async Task SendPasswordResetAsync(string toEmail, string resetLink, string lang = "en")
    {
        var isPt = lang == "pt";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = isPt ? "Redefinir a sua password" : "Reset your password";

        var heading = isPt ? "Redefinir password" : "Reset your password";
        var body = isPt
            ? "Recebemos um pedido para redefinir a password da sua conta Fluxnote. Clique no botão abaixo para escolher uma nova password."
            : "We received a request to reset the password for your Fluxnote account. Click the button below to choose a new password.";
        var btnText = isPt ? "Redefinir password" : "Reset my password";
        var expiry = isPt
            ? "Este link expira em <b>1 hora</b>. Se não pediu a redefinição de password, pode ignorar este email."
            : "This link will expire in <b>1 hour</b>. If you didn't request a password reset, you can safely ignore this email.";
        var fallback = isPt
            ? "Se o botão não funcionar, copie e cole este link no seu browser:"
            : "If the button doesn't work, copy and paste this link into your browser:";
        var footer = isPt
            ? "Recebeu este email porque foi pedida a redefinição de password da sua conta Fluxnote.<br>Se não fez este pedido, pode ignorar esta mensagem."
            : "You received this email because a password reset was requested for your Fluxnote account.<br>If you didn't request this, you can safely ignore it.";
        var htmlLang = isPt ? "pt" : "en";

        var bodyHtml = $@"
<!DOCTYPE html>
<html lang=""{htmlLang}"">
<head>
  <meta charset=""UTF-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
</head>
<body style=""margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, Helvetica, sans-serif;"">
  <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f3f4f6; padding:40px 0;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""480"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.07);"">
          <!-- Header -->
          <tr>
            <td style=""background-color:#155347; padding:32px 40px; text-align:center;"">
              <h1 style=""margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:-0.5px;"">Fluxnote</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style=""padding:40px;"">
              <h2 style=""margin:0 0 8px; color:#111827; font-size:22px; font-weight:600;"">{heading}</h2>
              <p style=""margin:0 0 24px; color:#6b7280; font-size:15px; line-height:1.6;"">
                {body}
              </p>
              <!-- Button -->
              <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"">
                <tr>
                  <td align=""center"" style=""padding:8px 0 32px;"">
                    <a href=""{resetLink}""
                       style=""display:inline-block; padding:14px 36px; background-color:#155347; color:#ffffff; text-decoration:none; font-size:15px; font-weight:600; border-radius:8px; letter-spacing:0.3px;"">
                      {btnText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style=""margin:0 0 8px; color:#9ca3af; font-size:13px; line-height:1.5;"">
                {expiry}
              </p>
              <p style=""margin:0 0 16px; color:#9ca3af; font-size:13px; line-height:1.5;"">
                {fallback}
              </p>
              <p style=""margin:0; word-break:break-all; color:#155347; font-size:13px; line-height:1.5;"">
                {resetLink}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style=""padding:24px 40px; background-color:#f9fafb; border-top:1px solid #e5e7eb; text-align:center;"">
              <p style=""margin:0; color:#9ca3af; font-size:12px; line-height:1.5;"">
                {footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        message.Body = new BodyBuilder { HtmlBody = bodyHtml }.ToMessageBody();

        using var client = new SmtpClient();
        var secure = _options.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
        await client.ConnectAsync(_options.SmtpHost, _options.SmtpPort, secure);
        await client.AuthenticateAsync(_options.SmtpUser, _options.SmtpPass);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
