using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Dtos.Documents
{
    /// <summary>
    /// DTO de resposta para uma permissão explícita de documento.
    /// </summary>
    public class DocumentPermissionDto
    {
        /// <summary>Identificador único da permissão.</summary>
        public int Id { get; set; }

        /// <summary>ID do documento ao qual a permissão pertence.</summary>
        public int DocumentId { get; set; }

        /// <summary>ID do membro da equipa a quem a permissão foi atribuída.</summary>
        public int TeamMemberId { get; set; }

        /// <summary>Nome do membro da equipa.</summary>
        public string MemberName { get; set; } = string.Empty;

        /// <summary>Role do membro na equipa (0=Member, 1=TeamAdmin, 2=Owner).</summary>
        public int MemberRole { get; set; } // TeamRole: 0=Member, 1=TeamAdmin, 2=Owner

        /// <summary>Role do membro neste documento (0=Viewer, 1=Editor).</summary>
        public int DocumentRole { get; set; } // 0=Viewer, 1=Editor
    }

    /// <summary>
    /// DTO de pedido para criação de uma permissão de documento.
    /// </summary>
    public class CreateDocumentPermissionRequest
    {
        /// <summary>ID do documento.</summary>
        [Required]
        public int DocumentId { get; set; }

        /// <summary>ID do membro da equipa que receberá a permissão.</summary>
        [Required]
        public int TeamMemberId { get; set; }

        /// <summary>Role a atribuir no documento (0=Viewer, 1=Editor).</summary>
        [Required]
        public int Role { get; set; } // 0=Viewer, 1=Editor
    }

    /// <summary>
    /// DTO de pedido para atualização de uma permissão de documento.
    /// </summary>
    public class UpdateDocumentPermissionRequest
    {
        /// <summary>Novo role no documento (0=Viewer, 1=Editor).</summary>
        [Required]
        public int Role { get; set; } // 0=Viewer, 1=Editor
    }
}
