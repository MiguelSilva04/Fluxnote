using Fluxnote.Backend.Services.Email;

namespace Fluxnote.Backend.Tests.Fakes;

public class TestEmailSender : IEmailSender
{
    public string? LastToEmail { get; private set; }
    public string? LastConfirmationLink { get; private set; }

    public Task SendEmailConfirmationAsync(string toEmail, string confirmationLink)
    {
        LastToEmail = toEmail;
        LastConfirmationLink = confirmationLink;
        return Task.CompletedTask;
    }
}
