using Fluxnote.Backend.Data;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Services.Email;
using Microsoft.EntityFrameworkCore;

namespace Fluxnote.Backend.Services.Notifications;

/// <summary>
/// Implementação do serviço de notificações.
/// Coordena a criação de notificações in-app e o envio de emails,
/// respeitando a língua preferida do utilizador.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly FluxnoteServerContext _context;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        FluxnoteServerContext context,
        IEmailSender emailSender,
        ILogger<NotificationService> logger)
    {
        _context = context;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task<bool> SendAsync(NotificationRequest request)
    {
        var preferences = await GetOrCreatePreferencesAsync(request.UserId);
        var isPt = preferences.Language == "pt";
        var sent = false;

        // Notificação in-app: guardar ambas as versões para o frontend resolver
        if (preferences.InAppEnabled)
        {
            var notification = new Notification
            {
                UserId = request.UserId,
                Type = request.Type,
                Title = request.Title,
                TitlePt = request.TitlePt,
                Message = request.Message,
                MessagePt = request.MessagePt,
                ReferenceId = request.ReferenceId,
                ReferenceType = request.ReferenceType,
                ReferenceToken = request.ReferenceToken,
                ActorId = request.ActorId,
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
            sent = true;
        }

        // Notificação por email
        if (preferences.EmailEnabled)
        {
            var user = await _context.Users.FindAsync(request.UserId);
            if (user?.Email != null)
            {
                var emailTitle = isPt && request.TitlePt != null ? request.TitlePt : request.Title;
                var emailMessage = isPt && request.MessagePt != null ? request.MessagePt : request.Message;

                var subject = isPt
                    ? (request.EmailSubjectPt ?? request.EmailSubject ?? emailTitle)
                    : (request.EmailSubject ?? emailTitle);

                var body = isPt
                    ? (request.EmailHtmlBodyPt ?? request.EmailHtmlBody ?? BuildDefaultEmailHtml(emailTitle, emailMessage, isPt))
                    : (request.EmailHtmlBody ?? BuildDefaultEmailHtml(emailTitle, emailMessage, isPt));

                try
                {
                    await _emailSender.SendNotificationEmailAsync(user.Email, subject, body);
                    sent = true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send notification email to {Email}", user.Email);
                }
            }
        }

        return sent;
    }

    public async Task SendSecurityEmailAsync(string toEmail, string subject, string htmlBody)
    {
        try
        {
            await _emailSender.SendNotificationEmailAsync(toEmail, subject, htmlBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send security email to {Email}", toEmail);
        }
    }

    public async Task<bool> HasAnyChannelEnabledAsync(string userId)
    {
        var preferences = await GetOrCreatePreferencesAsync(userId);
        return preferences.EmailEnabled || preferences.InAppEnabled;
    }

    public async Task<NotificationPreference> GetOrCreatePreferencesAsync(string userId)
    {
        var preferences = await _context.NotificationPreferences
            .FirstOrDefaultAsync(np => np.UserId == userId);

        if (preferences == null)
        {
            preferences = new NotificationPreference
            {
                UserId = userId,
                EmailEnabled = true,
                InAppEnabled = true,
                Language = "en"
            };
            _context.NotificationPreferences.Add(preferences);
            await _context.SaveChangesAsync();
        }

        return preferences;
    }

    private static string BuildDefaultEmailHtml(string title, string message, bool isPt)
    {
        var footer = isPt
            ? "Recebeu este email devido às suas definições de notificação no Fluxnote."
            : "You received this email because of your notification settings on Fluxnote.";
        var htmlLang = isPt ? "pt" : "en";

        return $@"
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
          <tr>
            <td style=""background-color:#155347; padding:32px 40px; text-align:center;"">
              <h1 style=""margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:-0.5px;"">Fluxnote</h1>
            </td>
          </tr>
          <tr>
            <td style=""padding:40px;"">
              <h2 style=""margin:0 0 8px; color:#111827; font-size:22px; font-weight:600;"">{title}</h2>
              <p style=""margin:0 0 24px; color:#6b7280; font-size:15px; line-height:1.6;"">{message}</p>
            </td>
          </tr>
          <tr>
            <td style=""padding:24px 40px; background-color:#f9fafb; border-top:1px solid #e5e7eb; text-align:center;"">
              <p style=""margin:0; color:#9ca3af; font-size:12px; line-height:1.5;"">{footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }
}
