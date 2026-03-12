namespace Fluxnote.Backend.Dtos.Documents
{
    public class CommentMentionDto
{
        public int Id { get; set; }
        public string MentionedUserId { get; set; } = string.Empty;
    }
}
