using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Folders
{
    /// <summary>
    /// DTO de resposta para uma pasta de documentos.
    /// </summary>
    public class FolderDto
    {
        /// <summary>Identificador único da pasta.</summary>
        public int Id { get; set; }

        /// <summary>Nome da pasta.</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>ID da equipa à qual a pasta pertence.</summary>
        public int TeamId { get; set; }

        /// <summary>Data de criação da pasta (UTC).</summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>Data da última atualização da pasta (UTC).</summary>
        public DateTime UpdatedAt { get; set; }

        /// <summary>Número de documentos não eliminados dentro da pasta.</summary>
        public int DocumentCount { get; set; }
    }

    /// <summary>
    /// DTO de pedido para criação de nova pasta.
    /// </summary>
    public class CreateFolderRequest
    {
        /// <summary>Nome da pasta a criar.</summary>
        [Required(ErrorMessage = "Folder name is required.")]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>ID da equipa onde a pasta será criada.</summary>
        [Required]
        public int TeamId { get; set; }
    }

    /// <summary>
    /// DTO de pedido para renomear uma pasta existente.
    /// </summary>
    public class UpdateFolderRequest
    {
        /// <summary>Novo nome da pasta.</summary>
        [Required(ErrorMessage = "Folder name is required.")]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
    }
}
