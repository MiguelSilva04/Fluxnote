namespace Fluxnote.Backend.Dtos.Notifications;

/// <summary>
/// DTO de resposta para uma notificação.
/// </summary>
public class NotificationDto
{
    public int Id { get; set; }
    public int Type { get; set; }
    public string Title { get; set; } = default!;
    public string? TitlePt { get; set; }
    public string Message { get; set; } = default!;
    public string? MessagePt { get; set; }
    public bool IsRead { get; set; }
    public string CreatedAt { get; set; } = default!;
    public int? ReferenceId { get; set; }
    public string? ReferenceType { get; set; }
    public string? ActorId { get; set; }
    public string? ActorName { get; set; }

    /// <summary>
    /// Token do convite associado, para navegação à página de aceitação.
    /// Preenchido apenas em notificações de DocumentInvite e TeamInvite.
    /// </summary>
    public string? ReferenceToken { get; set; }
}

/// <summary>
/// DTO de resposta para as preferências de notificação.
/// </summary>
public class NotificationPreferenceDto
{
    public bool EmailEnabled { get; set; }
    public bool InAppEnabled { get; set; }
    public string Language { get; set; } = "en";
}

/// <summary>
/// DTO de request para atualizar preferências de notificação.
/// </summary>
public class UpdateNotificationPreferenceDto
{
    public bool EmailEnabled { get; set; }
    public bool InAppEnabled { get; set; }
    public string Language { get; set; } = "en";
}

/// <summary>
/// DTO de request para convite por email (documento ou equipa).
/// </summary>
public class EmailInviteRequest
{
    public string Email { get; set; } = default!;
}

