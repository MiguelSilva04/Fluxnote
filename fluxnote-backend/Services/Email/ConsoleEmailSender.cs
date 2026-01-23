using Microsoft.Identity.Client;

namespace Fluxnote.Backend.Services.Email;

public class ConsoleEmailSender : IEmailSender
{
    private readonly ILogger<ConsoleEmailSender> _logger;
    private readonly IDevEmailStore _store;

    public ConsoleEmailSender(ILogger<ConsoleEmailSender> logger, IDevEmailStore store)
    {
        _logger = logger;
        _store = store;
    }
    public Task SendEmailConfirmationAsync(string toEmail, string confirmationLink)
    {
        _store.Save(toEmail, confirmationLink);
        Console.WriteLine($"[DEV EMAIL] To: {toEmail}");
        Console.WriteLine($"[DEV EMAIL] Link: {confirmationLink}");
        //_logger.LogInformation("Simulated sending email to {ToEmail} with confirmation link: {ConfirmationLink}", toEmail, confirmationLink);
        return Task.CompletedTask;
    }
}

