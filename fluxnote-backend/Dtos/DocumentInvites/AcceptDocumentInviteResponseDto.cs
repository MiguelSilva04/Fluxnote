namespace Fluxnote.Backend.Dtos.DocumentInvites
{
    /// <summary>
    /// DTO de resposta devolvido após aceitação de convite de documento.
    /// </summary>
    public class AcceptDocumentInviteResponseDto
    {
        /// <summary>
        /// Identificador do documento para o qual o convite foi aceito. 
        /// Este campo é necessário para que o frontend saiba qual documento abrir após o utilizador aceitar o convite.
        /// </summary>
        public int TeamId { get; set; }
        /// <summary>
        /// Identificador do documento para o qual o convite foi aceito.
        /// </summary>
        public int DocumentId { get; set; }
        /// <summary>
        /// Titulo do documento para o qual o convite foi aceito. Este campo é incluído para facilitar a exibição de informações sobre o documento, sem a necessidade de uma consulta adicional para obter o título do documento. 
        /// Ele é preenchido no momento da criação do DTO com base na relação entre o convite e o documento correspondente.
        /// </summary>
        public string DocumentTitle { get; set; } = string.Empty;
        /// <summary>
        /// Nome da equipa à qual o documento pertence. 
        /// Este campo é incluído para facilitar a exibição de informações sobre a equipa, 
        /// sem a necessidade de uma consulta adicional para obter o nome da equipa.
        /// </summary>
        public string TeamName { get; set; } = string.Empty;
        /// <summary>
        /// Role a ser atribuído ao utilizador convidado ao aceitar o convite.
        /// 0 = Viewer, 1 = Editor. Este campo é necessário para que o 
        /// frontend saiba qual permissão atribuir ao utilizador quando ele aceitar o convite.
        /// </summary>
        public int DocumentRole { get; set; }
    }
}
