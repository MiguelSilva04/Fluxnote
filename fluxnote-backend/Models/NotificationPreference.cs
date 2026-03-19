namespace Fluxnote.Backend.Models
{
    /// <summary>
    /// Preferências de notificação de um utilizador.
    /// Controla quais canais (email, in-app) estão ativos.
    /// </summary>
    public class NotificationPreference
    {
        public int Id { get; set; }

        /// <summary>Utilizador dono das preferências.</summary>
        public string UserId { get; set; } = default!;
        public User User { get; set; } = default!;

        /// <summary>Notificações por email ativadas.</summary>
        public bool EmailEnabled { get; set; } = true;

        /// <summary>Notificações in-app ativadas.</summary>
        public bool InAppEnabled { get; set; } = true;

        /// <summary>Idioma preferido do utilizador, utilizado para notificações,
        /// no frontend para exibição de conteúdo traduzido e pelo ChangePasswordRequest para
        /// o email de notificação.</summary>
        public string Language { get; set; } = "en";
    }
}
