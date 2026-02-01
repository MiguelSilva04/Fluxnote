using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// DTO para pedido de criação de novo documento.
    /// Usado no endpoint POST /api/documents.
    /// </summary>
    /// <remarks>
    /// <b>Opções de Equipa:</b>
    /// <list type="bullet">
    ///     <item><description><b>TeamId especificado:</b> Documento criado na equipa existente (requer ser Owner)</description></item>
    ///     <item><description><b>Apenas TeamName:</b> Cria nova equipa com esse nome, utilizador torna-se Owner</description></item>
    ///     <item><description><b>Nenhum:</b> Erro 400 - deve especificar equipa</description></item>
    /// </list>
    /// <b>Limite:</b> Máximo 10 documentos por utilizador (plano Free).
    /// </remarks>
    public class CreateDocumentRequest
    {
        /// <summary>
        /// Título do documento (obrigatório, máx. 255 caracteres).
        /// </summary>
        [Required(ErrorMessage = "O título é obrigatório")]
        [MaxLength(255, ErrorMessage = "O título não pode ter mais de 255 caracteres")]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// ID da equipa onde o documento será criado.
        /// </summary>
        /// <remarks>
        /// Se especificado, o documento é adicionado à equipa existente.<br/>
        /// <b>Requer:</b> Ser Owner da equipa.
        /// </remarks>
        public int? TeamId { get; set; }

        /// <summary>
        /// Nome para nova equipa a criar (usado se TeamId não for especificado).
        /// </summary>
        /// <remarks>
        /// Se TeamId não for especificado, este campo torna-se obrigatório.<br/>
        /// Uma nova equipa será criada com o utilizador como Owner.
        /// </remarks>
        [MaxLength(100, ErrorMessage = "O nome da equipa não pode ter mais de 100 caracteres")]
        public string? TeamName { get; set; }
    }
}
