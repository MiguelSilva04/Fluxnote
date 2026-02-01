using Microsoft.AspNetCore.Identity;

namespace Fluxnote.Backend.Models
{
    /// <summary>
    /// Representa um utilizador do sistema Fluxnote.
    /// Estende IdentityUser do ASP.NET Core Identity para gestão de autenticação.
    /// </summary>
    /// <remarks>
    /// Funcionalidades principais:
    /// <list type="bullet">
    ///     <item><description>Autenticação via email/password (Local) ou OAuth (Google, Microsoft)</description></item>
    ///     <item><description>Perfil personalizável com foto, localização, bio e timezone</description></item>
    ///     <item><description>Controlo de estado da conta (pendente, ativo, suspenso, bloqueado)</description></item>
    ///     <item><description>Limitação de alterações de username (máx. 3 por mês)</description></item>
    /// </list>
    /// Relacionamentos:
    /// <list type="bullet">
    ///     <item><description>1:N com TeamMember - utilizador pode pertencer a várias equipas</description></item>
    ///     <item><description>1:N com RefreshToken - utilizador pode ter várias sessões ativas</description></item>
    ///     <item><description>1:N com Document (via CreatedById) - utilizador pode criar vários documentos</description></item>
    /// </list>
    /// </remarks>
    public class User : IdentityUser
    {
        /// <summary>
        /// Nome completo do utilizador para exibição.
        /// </summary>
        /// <example>João Silva</example>
        public string? FullName { get; set; }

        /// <summary>
        /// Localização geográfica do utilizador (cidade, país).
        /// </summary>
        /// <example>Lisboa, Portugal</example>
        public string? Location { get; set; }

        /// <summary>
        /// Biografia ou descrição pessoal do utilizador.
        /// </summary>
        public string? Bio { get; set; }

        /// <summary>
        /// Fuso horário preferido do utilizador (formato IANA).
        /// </summary>
        /// <example>Europe/Lisbon</example>
        public string? Timezone { get; set; }

        /// <summary>
        /// Data e hora de criação da conta (UTC).
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Data e hora da última atualização do perfil (UTC).
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// URL da foto de perfil do utilizador.
        /// Pode ser URL externa ou base64 data URI.
        /// </summary>
        public string? ProfilePictureUrl { get; set; }

        /// <summary>
        /// Estado atual da conta do utilizador.
        /// Determina se o utilizador pode aceder ao sistema.
        /// </summary>
        /// <seealso cref="AccountStatus"/>
        public AccountStatus AccountStatus { get; set; } = AccountStatus.Active;

        /// <summary>
        /// Método de autenticação utilizado para criar a conta.
        /// </summary>
        /// <seealso cref="AuthProvider"/>
        public AuthProvider AuthProvider { get; set; } = AuthProvider.Local;

        /// <summary>
        /// Coleção de associações a equipas (via TeamMember).
        /// </summary>
        public ICollection<TeamMember> Teams { get; set; } = new List<TeamMember>();

        /// <summary>
        /// Contador de alterações de username no mês atual.
        /// Limite máximo: 3 alterações por mês.
        /// </summary>
        /// <remarks>
        /// Resetado automaticamente no início de cada mês.
        /// </remarks>
        public int UsernameChangesThisMonth { get; set; } = 0;

        /// <summary>
        /// Data do último reset do contador de alterações de username.
        /// Usado para determinar quando resetar o contador mensal.
        /// </summary>
        public DateTime? LastUsernameChangeReset { get; set; }
    }

    /// <summary>
    /// Define os métodos de autenticação suportados pelo sistema.
    /// </summary>
    public enum AuthProvider
    {
        /// <summary>
        /// Autenticação tradicional com email e password.
        /// Password armazenada com hash PBKDF2.
        /// </summary>
        Local = 0,

        /// <summary>
        /// Autenticação via OAuth 2.0 com Google.
        /// </summary>
        Google = 1,

        /// <summary>
        /// Autenticação via OAuth 2.0 com Microsoft.
        /// </summary>
        Microsoft = 2
    }

    /// <summary>
    /// Métodos de extensão para <see cref="AuthProvider"/>.
    /// </summary>
    public static class AuthProviderExtensions
    {
        /// <summary>
        /// Converte o valor do enum para string legível.
        /// </summary>
        /// <param name="provider">Provedor de autenticação.</param>
        /// <returns>Nome do provedor em formato legível.</returns>
        public static string ToDisplayString(this AuthProvider provider)
        {
            return provider switch
            {
                AuthProvider.Local => "Local",
                AuthProvider.Google => "Google",
                AuthProvider.Microsoft => "Microsoft",
                _ => "Unknown"
            };
        }
    }

    /// <summary>
    /// Define os estados possíveis de uma conta de utilizador.
    /// </summary>
    /// <remarks>
    /// Fluxo típico de estados:
    /// Registo → PendingEmailConfirmation → (confirmar email) → Active.
    /// Ações administrativas podem mover para Suspended ou Blocked.
    /// </remarks>
    public enum AccountStatus
    {
        /// <summary>
        /// Conta criada mas aguarda confirmação de email.
        /// Utilizador não pode fazer login neste estado.
        /// </summary>
        PendingEmailConfirmation = 0,

        /// <summary>
        /// Conta ativa e funcional.
        /// Utilizador tem acesso completo ao sistema.
        /// </summary>
        Active = 1,

        /// <summary>
        /// Conta temporariamente suspensa.
        /// Pode ser reativada por administrador.
        /// </summary>
        Suspended = 2,

        /// <summary>
        /// Conta permanentemente bloqueada.
        /// Requer intervenção administrativa para desbloquear.
        /// </summary>
        Blocked = 3
    }

    /// <summary>
    /// Métodos de extensão para <see cref="AccountStatus"/>.
    /// </summary>
    public static class AccountStatusExtensions
    {
        /// <summary>
        /// Converte o valor do enum para string legível.
        /// </summary>
        /// <param name="status">Estado da conta.</param>
        /// <returns>Descrição do estado em formato legível.</returns>
        public static string ToDisplayString(this AccountStatus status)
        {
            return status switch
            {
                AccountStatus.PendingEmailConfirmation => "Pending Email Confirmation",
                AccountStatus.Active => "Active",
                AccountStatus.Suspended => "Suspended",
                AccountStatus.Blocked => "Blocked",
                _ => "Unknown"
            };
        }
    }
}
