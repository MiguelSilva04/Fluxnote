namespace Fluxnote.Backend.Models
{
    /// <summary>
    /// Tipos de notificação suportados pelo sistema.
    /// </summary>
    public enum NotificationType
    {
        /// <summary>Convite para um documento (por email).</summary>
        DocumentInvite = 0,

        /// <summary>Convite para uma equipa (por email).</summary>
        TeamInvite = 1,

        /// <summary>Menção num comentário (@utilizador).</summary>
        CommentMention = 2,

        /// <summary>Adicionado a um documento (permissão criada).</summary>
        AddedToDocument = 3,

        /// <summary>Comentário foi resolvido (notifica o autor).</summary>
        CommentResolved = 4,

        /// <summary>Resposta a um comentário (notifica o autor do comentário pai).</summary>
        CommentReply = 5,

        /// <summary>Password alterada (email de segurança, ignora preferências).</summary>
        PasswordChanged = 6
    }
}
