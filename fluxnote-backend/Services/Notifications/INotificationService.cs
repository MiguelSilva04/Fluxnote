using Fluxnote.Backend.Models;

namespace Fluxnote.Backend.Services.Notifications;

/// <summary>
/// Serviço central de notificações. Gere a criação de notificações in-app
/// e o envio de emails com base nas preferências do utilizador.
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Envia uma notificação (in-app e/ou email) ao utilizador, respeitando as suas preferências.
    /// </summary>
    /// <param name="request">Dados da notificação a enviar.</param>
    /// <returns>True se pelo menos um canal (in-app ou email) foi utilizado.</returns>
    Task<bool> SendAsync(NotificationRequest request);

    /// <summary>
    /// Envia uma notificação de segurança por email que ignora as preferências do utilizador.
    /// Usado para eventos sensíveis como alteração de password.
    /// </summary>
    Task SendSecurityEmailAsync(string toEmail, string subject, string htmlBody);

    /// <summary>
    /// Verifica se o utilizador tem pelo menos um canal de notificação ativo.
    /// Útil para avisar o invocador que deve usar convite por link.
    /// </summary>
    Task<bool> HasAnyChannelEnabledAsync(string userId);

    /// <summary>
    /// Obtém ou cria as preferências de notificação de um utilizador.
    /// </summary>
    Task<NotificationPreference> GetOrCreatePreferencesAsync(string userId);
}

/// <summary>
/// Request para enviar uma notificação.
/// </summary>
public class NotificationRequest
{
    /// <summary>ID do utilizador que recebe a notificação.</summary>
    public string UserId { get; set; } = default!;

    /// <summary>Tipo de notificação.</summary>
    public NotificationType Type { get; set; }

    /// <summary>Título (inglês).</summary>
    public string Title { get; set; } = default!;

    /// <summary>Mensagem (inglês).</summary>
    public string Message { get; set; } = default!;

    /// <summary>Título (português). Se null, usa o inglês.</summary>
    public string? TitlePt { get; set; }

    /// <summary>Mensagem (português). Se null, usa o inglês.</summary>
    public string? MessagePt { get; set; }

    /// <summary>ID do recurso relacionado (documento, equipa, etc.).</summary>
    public int? ReferenceId { get; set; }

    /// <summary>Tipo de recurso ("Document", "Team", "Comment").</summary>
    public string? ReferenceType { get; set; }

    /// <summary>ID do utilizador que gerou a ação (quem convidou, comentou, etc.).</summary>
    public string? ActorId { get; set; }

    /// <summary>Token do convite associado (para notificações de convite).</summary>
    public string? ReferenceToken { get; set; }

    /// <summary>Assunto do email em inglês (se diferente do título).</summary>
    public string? EmailSubject { get; set; }

    /// <summary>Assunto do email em português.</summary>
    public string? EmailSubjectPt { get; set; }

    /// <summary>Corpo HTML do email em inglês. Se null, é gerado automaticamente.</summary>
    public string? EmailHtmlBody { get; set; }

    /// <summary>Corpo HTML do email em português. Se null, usa o inglês.</summary>
    public string? EmailHtmlBodyPt { get; set; }
}
