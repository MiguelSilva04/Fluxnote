namespace Fluxnote.Backend.Models
{

    /// <summary>
    /// Representa um comentário feito em um documento. Os comentários podem ser hierárquicos, permitindo respostas a outros comentários. Cada comentário está associado a um documento e a um usuário (autor). Os comentários também armazenam informações sobre a posição no texto onde foram feitos, o conteúdo do comentário, se estão resolvidos ou não, e a cor associada ao autor para destaque visual.
    /// </summary>
    public class DocumentComment
    {
        /// <summary>
        /// Identificador único do comentário (chave primária).
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// ID do documento ao qual o comentário pertence.
        /// </summary>
        public int DocumentId { get; set; }
        
        /// <summary>
        /// ID do usuário que criou o comentário. Pode ser usado para exibir o nome do autor, associar uma cor ou para controle de permissões (ex: permitir que apenas o autor edite ou exclua o comentário).
        /// </summary>
        public string UserId { get; set; }

        /// <summary>
        /// ID do comentário pai, caso este seja uma resposta a outro comentário. Se for um comentário raiz, esse campo pode ser nulo.
        /// </summary>
        public int? ParentCommentId { get; set; } //  referência ao comentário pai (se for reply)

        /// <summary>
        /// Conteúdo do comentário. Pode ser texto simples ou conter formatação (ex: Markdown ou HTML) 
        /// dependendo de como o frontend lida com os comentários.
        /// </summary>
        public string Content { get; set; } = string.Empty;

        // posição no Quill

        /// <summary>
        /// Posição no editor Quill onde o comentário foi feito. Isso pode ser usado para destacar a parte do texto que está sendo comentada. Se for um comentário de seleção, isso indica o índice inicial da seleção. Se for um comentário de posição (sem seleção), isso indica a posição do cursor onde o comentário foi feito.
        /// </summary>
        public int? RangeIndex { get; set; }
        
        /// <summary>
        /// Comprimento do texto selecionado no editor Quill. Se for um comentário de seleção, isso indica quantos caracteres estão sendo comentados. Se for um comentário de posição (sem seleção), esse campo pode ser nulo ou zero.
        /// </summary>
        public int? RangeLength { get; set; }

        //public string? SelectedText { get; set; } = string.Empty;

        /// <summary>
        /// Indica se o comentário foi resolvido ou não. Isso pode ser usado para marcar visualmente os comentários que já foram tratados ou respondidos, ajudando os usuários a focar nos comentários que ainda precisam de atenção.
        /// </summary>
        public bool Resolved { get; set; } = false;

        /// <summary>
        /// Cor associada ao usuário que criou o comentário. Isso pode ser usado para destacar visualmente os comentários de diferentes usuários no frontend.
        /// </summary>
        public string CreatedByColor { get; set; } = string.Empty;

        /// <summary>
        /// Referência de navegação para o usuário que criou o comentário. Permite acessar informações adicionais do usuário, como nome, email, etc. Dependendo de como o backend lida com os usuários, isso pode ser útil para exibir o nome do autor ou outras informações no frontend.
        /// </summary>
        public User CreatedBy { get; set; } = null!;

        /// <summary>
        /// Data e hora em que o comentário foi criado.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Referência de navegação para o documento ao qual o comentário pertence. Permite acessar informações adicionais do documento, como título, conteúdo, etc. Dependendo de como o backend lida com os documentos, isso pode ser útil para exibir o título do documento ou outras informações no frontend.
        /// </summary>
        public Document Document { get; set; } = null!;

        /// <summary>
        /// Coleção de respostas ao comentário. Permite acessar todas as respostas associadas a este comentário.
        /// </summary>
        public ICollection<DocumentComment> CommentReplies { get; set; } = new List<DocumentComment>();
        
        /// <summary>
        /// Referência de navegação para o comentário pai, caso este seja uma resposta a outro comentário.
        /// </summary>
        public DocumentComment? ParentComment { get; set; }

        /// <summary>
        /// Referênça de navegação para as menções feitas dentro do comentário.
        /// </summary>
        public ICollection<CommentMention> Mentions { get; set; } = new List<CommentMention>();
    }
}
