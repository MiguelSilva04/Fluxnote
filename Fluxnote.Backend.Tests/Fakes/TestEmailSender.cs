using Fluxnote.Backend.Services.Email;

namespace Fluxnote.Backend.Tests.Fakes;

public class TestEmailSender : IEmailSender
{
    public string? LastToEmail { get; private set; }
    public string? LastConfirmationLink { get; private set; }
    public string? LastResetLink { get; private set; }

    public Task SendEmailConfirmationAsync(string toEmail, string confirmationLink, string lang = "en")
    {
        LastToEmail = toEmail;
        LastConfirmationLink = confirmationLink;
        return Task.CompletedTask;
    }

    public Task SendPasswordResetAsync(string toEmail, string resetLink, string lang = "en")
    {
        LastToEmail = toEmail;
        LastResetLink = resetLink;
        return Task.CompletedTask;
    }

    public string? LastNotificationSubject { get; private set; }
    public string? LastNotificationBody { get; private set; }

    public Task SendNotificationEmailAsync(string toEmail, string subject, string htmlBody)
    {
        LastToEmail = toEmail;
        LastNotificationSubject = subject;
        LastNotificationBody = htmlBody;
        return Task.CompletedTask;
    }
}
