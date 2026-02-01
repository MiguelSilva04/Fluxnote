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
    public async Task SendEmailConfirmationAsync(string toEmail, string confirmationLink)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = "Confirm your email";

        var bodyHtml =
            $@"<p>Thanks for join our community!</p>
               <p>Confirm your email by clicking here:</p>
               <p><a href=""{confirmationLink}"">Confirmar email</a></p>";

        message.Body = new BodyBuilder { HtmlBody = bodyHtml }.ToMessageBody();

        using var client = new SmtpClient();

        var secure = _options.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;

        await client.ConnectAsync(_options.SmtpHost, _options.SmtpPort, secure);
        await client.AuthenticateAsync(_options.SmtpUser, _options.SmtpPass);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
