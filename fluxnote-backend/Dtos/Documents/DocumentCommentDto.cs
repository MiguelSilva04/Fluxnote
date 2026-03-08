using Fluxnote.Backend.Models;

namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// DTO para representar um comentário em um documento. Inclui informações sobre o comentário, como conteúdo, autor, data de criação, posição no texto e se o comentário está resolvido ou não. Também inclui uma lista de respostas (replies) caso existam.
    /// </summary>
    public class DocumentCommentDto
    {
        /// <summary>
        /// ID do comentário. Útil para identificar o comentário, especialmente para operações de resposta, edição ou exclusão.
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
        /// Nome do usuário que criou o comentário. Pode ser obtido a partir do UserId, dependendo de como o backend lida com os usuários. Útil para exibir o nome do autor no frontend.
        /// </summary>
        public string CreatedByName { get; set; } = string.Empty;

        /// <summary>
        /// Cor associada ao usuário que criou o comentário. Isso pode ser usado para destacar visualmente os comentários de diferentes usuários no frontend.
        /// </summary>
        public string CreatedByColor { get; set; } = string.Empty;

        /// <summary>
        /// Data e hora em que o comentário foi criado.
        /// </summary>
        public string CreatedAt { get; set; } = string.Empty;

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
        /// Lista de respostas (replies) a este comentário. Cada resposta é também um DocumentCommentDto, permitindo uma estrutura hierárquica de comentários e respostas. Se não houver respostas, essa lista pode estar vazia.
        /// </summary>
        public List<DocumentCommentDto> Replies { get; set; } = new();

    }
}
