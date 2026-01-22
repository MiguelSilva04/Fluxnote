using Microsoft.Identity.Client;

namespace Fluxnote.Backend.Services.Email;

public class ConsoleEmailSender : IEmailSender
{
    private readonly ILogger<ConsoleEmailSender> _logger;

    public ConsoleEmailSender(ILogger<ConsoleEmailSender> logger)
    {
        _logger = logger;
    }
    public Task SendEmailConfirmationAsync(string toEmail, string confirmationLink)
    {
        _logger.LogInformation("Simulated sending email to {ToEmail} with confirmation link: {ConfirmationLink}", toEmail, confirmationLink);
        return Task.CompletedTask;
    }
}

