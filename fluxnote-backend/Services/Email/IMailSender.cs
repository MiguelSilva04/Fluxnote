namespace Fluxnote.Backend.Services.Email;

public interface IEmailSender
{
    Task SendEmailConfirmationAsync(string toEmail, string confirmationLink);
}
