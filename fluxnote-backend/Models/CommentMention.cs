namespace Fluxnote.Backend.Models
{
    /// <summary>
    /// Representa uma menção (@user) feita dentro de um comentário.
    /// Liga um comentário a um utilizador mencionado.
    /// </summary>
    public class CommentMention
    {
        /// <summary>
        /// Identificador único da menção.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// ID do comentário onde a menção foi feita.
        /// </summary>
        public int CommentId { get; set; }

        /// <summary>
        /// Comentário associado à menção.
        /// </summary>
        public DocumentComment Comment { get; set; } = null!;

        /// <summary>
        /// ID do utilizador mencionado.
        /// </summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Utilizador mencionado.
        /// </summary>
        public User User { get; set; } = null!;
    }
}