namespace Fluxnote.Backend.Dtos.TeamInvites
{
    /// <summary>
    /// DTO de resposta devolvido após aceitação de convite de equipa.
    /// </summary>
    public class AcceptTeamInviteResponseDto
    {
        /// <summary>
        /// Identificador da equipa para o qual o convite foi aceito.
        /// </summary>
        public int TeamId { get; set; }
        /// <summary>
        /// Nome da equipa à qual o documento pertence. 
        /// Este campo é incluído para facilitar a exibição de informações sobre a equipa, 
        /// sem a necessidade de uma consulta adicional para obter o nome da equipa.
        /// </summary>
        public string TeamName { get; set; } = string.Empty;
    }
}