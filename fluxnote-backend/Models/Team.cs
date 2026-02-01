using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models
{
    /// <summary>
    /// Representa uma equipa colaborativa no sistema Fluxnote.
    /// Uma equipa agrupa utilizadores (membros) e documentos partilhados.
    /// </summary>
    /// <remarks>
    /// Funcionalidades principais:
    /// <list type="bullet">
    ///     <item><description>Organização de documentos em contexto colaborativo</description></item>
    ///     <item><description>Gestão de membros com diferentes níveis de permissão</description></item>
    ///     <item><description>Suporte para agendamento de eliminação futura</description></item>
    /// </list>
    /// Relacionamentos:
    /// <list type="bullet">
    ///     <item><description>1:N com TeamMember - equipa tem vários membros</description></item>
    ///     <item><description>1:N com Document - equipa contém vários documentos (cascade delete)</description></item>
    /// </list>
    /// Regras de Negócio:
    /// <list type="bullet">
    ///     <item><description>Cada equipa tem exatamente um proprietário (OwnerId)</description></item>
    ///     <item><description>Apenas o proprietário pode criar documentos na equipa</description></item>
    ///     <item><description>Eliminação da equipa remove em cascata todos os membros e documentos</description></item>
    /// </list>
    /// </remarks>
    public class Team
    {
        /// <summary>
        /// Identificador único da equipa (chave primária).
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Nome da equipa (obrigatório).
        /// </summary>
        /// <remarks>
        /// Usado para identificação visual da equipa na interface.
        /// </remarks>
        [Required(ErrorMessage = "A equipa precisa de nome")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Identificador do proprietário da equipa.
        /// </summary>
        /// <remarks>
        /// Corresponde ao Id de um TeamMember com Role = Owner.
        /// O proprietário tem controlo total sobre a equipa.
        /// </remarks>
        public int OwnerId { get; set; }

        /// <summary>
        /// Data e hora de criação da equipa (UTC).
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Data e hora da última modificação da equipa (UTC).
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Indica se a equipa está ativa.
        /// </summary>
        /// <remarks>
        /// Equipas inativas podem ter funcionalidades limitadas.
        /// </remarks>
        public bool IsActive { get; set; }

        /// <summary>
        /// Data agendada para eliminação automática da equipa.
        /// </summary>
        /// <remarks>
        /// Null se não houver eliminação agendada.
        /// Permite período de "graça" antes da eliminação definitiva.
        /// </remarks>
        public DateTime? DeletionScheduled { get; set; }

        /// <summary>
        /// Coleção de membros pertencentes à equipa.
        /// </summary>
        /// <seealso cref="TeamMember"/>
        public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();

        /// <summary>
        /// Coleção de documentos pertencentes à equipa.
        /// </summary>
        /// <remarks>
        /// Eliminados em cascata quando a equipa é removida.
        /// </remarks>
        /// <seealso cref="Document"/>
        public ICollection<Document> Documents { get; set; } = new List<Document>();
    }
}
