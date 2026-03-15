namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// DTO para criar um comentário num documento. Pode ser um comentário raiz ou uma resposta a outro comentário.
    /// </summary>
    public class CreateDocumentCommentDto
    {
        /// <summary>
        /// ID do documento ao qual o comentário pertence. Necessário para associar o comentário ao documento correto.
        /// </summary>
        public int DocumentId { get; set; }

        /// <summary>
        /// Conteúdo do comentário. Pode ser texto simples ou conter formatação (ex: Markdown ou HTML) 
        /// dependendo de como o frontend lida com os comentários.
        /// </summary>
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// Cor associada ao utilizador que criou o comentário. Isto pode ser usado para destacar visualmente os comentários de diferentes utilizadores no frontend.
        /// </summary>
        public string CreatedByColor { get; set; } = string.Empty;

        /// <summary>
        /// Posição no editor Quill.
        /// </summary>
        public int? RangeIndex { get; set; }

        /// <summary>
        /// Comprimento do texto selecionado no editor Quill. Se for um comentário de seleção, isto indica quantos caracteres estão a ser comentados.
        /// Se for um comentário de posição (sem seleção), este campo pode ser nulo ou zero.
        /// </summary>
        public int? RangeLength { get; set; }

        /// <summary>
        /// ID do utilizador que criou o comentário. Pode ser obtido do contexto de autenticação.
        /// </summary>
        public string UserId { get; set; } // ou obter do contexto autenticado

        /// <summary>
        /// ID do comentário pai, caso este seja uma resposta a outro comentário. Se for um comentário raiz, esse campo pode ser nulo.
        /// </summary>
        public int? ParentCommentId { get; set; } // se for reply

        /// <summary>
        /// Lista de IDs de utilizadores mencionados no comentário
        /// </summary>
        public List<string>? MentionedUserIds { get; set; }

    }
}
