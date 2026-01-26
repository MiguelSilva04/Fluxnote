using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using System.Net.Mail;
using SmtpClient = MailKit.Net.Smtp.SmtpClient;

namespace Fluxnote.Backend.Services.Email;

public class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;

    public SmtpEmailSender(IOptions<EmailOptions> options)
    {
        _options = options.Value;
    }

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
