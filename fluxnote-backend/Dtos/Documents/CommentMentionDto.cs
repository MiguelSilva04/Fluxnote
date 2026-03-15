namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// DTO para representar uma menção de utilizador num comentário.
    /// </summary>
    public class CommentMentionDto
    {
        /// <summary>
        /// Identificador único da menção.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// ID do utilizador mencionado no comentário.
        /// </summary>
        public string MentionedUserId { get; set; } = string.Empty;
    }
}
