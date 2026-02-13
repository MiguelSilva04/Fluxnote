namespace Fluxnote.Backend.Dtos.TeamInvites
{
    public class AcceptInviteResponseDto
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
        /// <summary>
        /// Role a ser atribuído ao usuário convidado ao aceitar o convite.
        /// 0 = Member, 1 = TeamAdmin, 2 = Owner. Este campo é necessário para que o 
        /// frontend saiba qual permissão atribuir ao usuário quando ele aceitar o convite.
        /// </summary>
        public int TeamRole { get; set; }
    }
}