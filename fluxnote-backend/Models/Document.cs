using Fluxnote.Backend.Models;

namespace Fluxnote.Backend.Models
{
    public class Document
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int TeamId { get; set; }
    }
}
