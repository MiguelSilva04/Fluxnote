namespace Fluxnote.Backend.Dtos.DocumentInvites
{
    /// <summary>
    /// DTO de resposta para exibição de um convite de documento.
    /// </summary>
    public class DocumentInviteDto
    {
        /// <summary>
        /// Identificador único do convite. 
        /// Este é o ID do convite na base de dados e é usado para referência interna.
        /// </summary>
        public int Id { get; set; }
        /// <summary>
        /// Token único para o link do convite.
        /// </summary>
        public string Token { get; set; } = string.Empty;
        /// <summary>
        /// DocumentId é o identificador do documento para o qual o convite foi criado.
        /// </summary>
        public int DocumentId { get; set; }
        /// <summary>
        /// Título do documento para o qual o convite foi criado. Este campo é incluído para 
        /// facilitar a exibição de informações sobre o convite, sem a necessidade de uma 
        /// consulta adicional para obter o título do documento. 
        /// Ele é preenchido no momento da criação do DTO com base na relação entre o convite 
        /// e o documento correspondente.
        /// </summary>
        public string DocumentTitle { get; set; } = string.Empty;
        /// <summary>
        /// Identificador da equipa à qual o documento pertence. Este campo é incluído para 
        /// facilitar a exibição de informações sobre o convite, sem a necessidade de uma 
        /// consulta adicional para obter o ID da equipa.
        /// </summary>
        public int TeamId { get; set; }
        /// <summary>
        /// Nome da equipa à qual o documento pertence. Este campo é incluído para 
        /// facilitar a exibição
        /// </summary>
        public string TeamName { get; set; } = string.Empty;
        /// <summary>
        /// Nome do utilizador que criou o convite. Este campo é incluído para facilitar a exibição de 
        /// informações sobre o convite, sem a necessidade de uma consulta adicional para obter o nome do utilizador. 
        /// Ele é preenchido no momento da criação do DTO com base na relação entre o convite e o membro da equipa que o criou.
        /// </summary>
        public string CreatedByName { get; set; } = string.Empty;
        /// <summary>
        /// Role a ser atribuído ao utilizador convidado ao aceitar o convite.
        /// 0 = Viewer, 1 = Editor. Este campo é necessário para que o frontend 
        /// saiba qual permissão atribuir ao utilizador quando ele aceitar o convite.
        /// </summary>
        public int Role { get; set; }
        /// <summary>
        /// Data e hora em que o convite foi criado. Este campo é útil 
        /// para exibir informações sobre quando o convite foi gerado e para fins de auditoria.
        /// </summary>
        public DateTime ExpiresAt { get; set; }
        /// <summary>
        /// Indica se o convite foi revogado. 
        /// Um convite revogado não pode ser aceito, mesmo que ainda não tenha expirado.
        /// </summary>
        public bool IsRevoked { get; set; }
        /// <summary>
        /// Indica se o convite já foi utilizado. Um convite é considerado utilizado 
        /// se já tiver sido aceito por um utilizador.
        /// </summary>
        public bool IsUsed { get; set; }
        /// <summary>
        /// Url do convite que pode ser partilhada com o utilizador convidado. 
        /// Este é o link que o utilizador deve aceder para aceitar o convite.
        /// </summary>
        public string InviteUrl { get; set; } = string.Empty;
    }
}
