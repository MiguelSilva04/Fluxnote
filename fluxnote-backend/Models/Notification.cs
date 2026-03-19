namespace Fluxnote.Backend.Models
{
    /// <summary>
    /// Representa uma notificação in-app para um utilizador.
    /// </summary>
    public class Notification
    {
        public int Id { get; set; }

        /// <summary>Utilizador que recebe a notificação.</summary>
        public string UserId { get; set; } = default!;
        public User User { get; set; } = default!;

        /// <summary>Tipo de notificação (enum).</summary>
        public NotificationType Type { get; set; }

        /// <summary>Título curto da notificação (inglês).</summary>
        public string Title { get; set; } = default!;

        /// <summary>Título curto da notificação (português).</summary>
        public string? TitlePt { get; set; }

        /// <summary>Mensagem descritiva da notificação (inglês).</summary>
        public string Message { get; set; } = default!;

        /// <summary>Mensagem descritiva da notificação (português).</summary>
        public string? MessagePt { get; set; }

        /// <summary>Se a notificação foi lida.</summary>
        public bool IsRead { get; set; } = false;

        /// <summary>Data de criação (UTC).</summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// ID do recurso relacionado (documento, equipa, comentário, etc.).
        /// Permite navegação direta ao clicar na notificação.
        /// </summary>
        public int? ReferenceId { get; set; }

        /// <summary>
        /// Tipo de recurso referenciado ("Document", "Team", "Comment").
        /// </summary>
        public string? ReferenceType { get; set; }

        /// <summary>
        /// Token do convite associado, para navegação à página de aceitação.
        /// Preenchido apenas em notificações de convite (DocumentInvite, TeamInvite).
        /// </summary>
        public string? ReferenceToken { get; set; }

        /// <summary>
        /// ID do utilizador que causou a notificação (quem convidou, comentou, etc.).
        /// Nullable para notificações de sistema.
        /// </summary>
        public string? ActorId { get; set; }
        public User? Actor { get; set; }
    }
}
