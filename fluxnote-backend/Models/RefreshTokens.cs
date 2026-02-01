using System.ComponentModel.DataAnnotations;

namespace Fluxnote.Backend.Models;

/// <summary>
/// Representa um token de atualização (refresh token) para autenticação JWT.
/// Permite renovar o access token sem necessidade de nova autenticação com credenciais.
/// </summary>
/// <remarks>
/// Mecanismo de Segurança:
/// <list type="bullet">
///     <item><description>Hash SHA256: Token armazenado como hash, nunca em texto plano</description></item>
///     <item><description>Rotação: Cada uso gera novo token e invalida o anterior</description></item>
///     <item><description>Deteção de Reutilização: Uso de token já rotacionado revoga toda a sessão</description></item>
///     <item><description>Expiração Dupla: Timeout de inatividade (7 dias) + absoluto (30 dias)</description></item>
/// </list>
/// Políticas de Expiração:
/// <list type="bullet">
///     <item><description>IdleDays (7): Sessão expira se não usada por X dias</description></item>
///     <item><description>AbsoluteDays (7/30): Sessão expira independentemente de uso</description></item>
///     <item><description>RememberMe: Aumenta AbsoluteDays de 7 para 30 dias</description></item>
/// </list>
/// Relacionamentos:
/// <list type="bullet">
///     <item><description>N:1 com User (cascade delete) - tokens eliminados com o utilizador</description></item>
/// </list>
/// Índices de BD:
/// <list type="bullet">
///     <item><description>TokenHash (único) - pesquisa eficiente e unicidade</description></item>
/// </list>
/// </remarks>
public class RefreshToken
{
    /// <summary>
    /// Identificador único do token (chave primária).
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Hash SHA256 do token em Base64 (índice único).
    /// </summary>
    /// <remarks>
    /// Gerado via: SHA256(token_bytes) → Base64.
    /// O token original (64 bytes random) é enviado ao cliente no cookie.
    /// Nunca armazenamos o token em texto plano por segurança.
    /// </remarks>
    [Required]
    [MaxLength(128)]
    public string TokenHash { get; set; } = default!;

    /// <summary>
    /// Identificador do utilizador proprietário da sessão (FK para User).
    /// </summary>
    [Required]
    public string UserId { get; set; } = default!;

    /// <summary>
    /// Referência de navegação para o utilizador.
    /// </summary>
    public User User { get; set; } = default!;

    /// <summary>
    /// Identificador único da sessão (GUID).
    /// </summary>
    /// <remarks>
    /// Agrupa tokens da mesma sessão (após rotações).
    /// Usado para revogar toda a sessão em caso de reutilização suspeita.
    /// </remarks>
    [Required]
    public string SessionId { get; set; } = default!;

    /// <summary>
    /// Momento de início da sessão (UTC).
    /// </summary>
    /// <remarks>
    /// Usado para calcular expiração absoluta (máx. 30 dias desde início).
    /// </remarks>
    public DateTime SessionStartedAt { get; set; }

    /// <summary>
    /// Último momento em que o token foi usado para refresh (UTC).
    /// </summary>
    /// <remarks>
    /// Usado para calcular expiração por inatividade (máx. 7 dias sem uso).
    /// </remarks>
    public DateTime LastUsedAt { get; set; }

    /// <summary>
    /// Momento de expiração do token (UTC).
    /// </summary>
    /// <remarks>
    /// Calculado como o mínimo entre:
    /// <list type="bullet">
    ///     <item><description>LastUsedAt + IdleDays (expiração por inatividade)</description></item>
    ///     <item><description>SessionStartedAt + AbsoluteDays (expiração absoluta)</description></item>
    /// </list>
    /// </remarks>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Momento de criação deste registo de token (UTC).
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Endereço IP do cliente que criou o token.
    /// </summary>
    /// <remarks>
    /// Útil para auditoria e deteção de atividade suspeita.
    /// </remarks>
    public string? CreatedByIp { get; set; }

    /// <summary>
    /// Momento em que o token foi revogado (UTC).
    /// </summary>
    /// <remarks>
    /// Null se o token ainda estiver válido.
    /// Preenchido quando:
    /// <list type="bullet">
    ///     <item><description>Token é rotacionado (substituído por novo)</description></item>
    ///     <item><description>Utilizador faz logout</description></item>
    ///     <item><description>Detetada reutilização suspeita (revoga toda sessão)</description></item>
    /// </list>
    /// </remarks>
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// Hash do token que substituiu este (após rotação).
    /// </summary>
    /// <remarks>
    /// Cria cadeia de tokens para rastreamento.
    /// Usado para detetar tentativa de uso de token já rotacionado.
    /// </remarks>
    public string? ReplacedByTokenHash { get; set; }

    /// <summary>
    /// Número de dias para expiração absoluta da sessão.
    /// </summary>
    /// <remarks>
    /// Valores típicos:
    /// <list type="bullet">
    ///     <item><description>7 dias: login normal</description></item>
    ///     <item><description>30 dias: login com "Lembrar-me"</description></item>
    /// </list>
    /// </remarks>
    public int? AbsoluteDays { get; set; }

    /// <summary>
    /// Número de dias máximo de inatividade permitida.
    /// </summary>
    /// <remarks>
    /// Valor padrão: 7 dias. Sessão expira se não usar refresh neste período.
    /// </remarks>
    public int? IdleDays { get; set; }

    /// <summary>
    /// Indica se o token já expirou (propriedade calculada).
    /// </summary>
    public bool isExpired => DateTime.UtcNow >= ExpiresAt;

    /// <summary>
    /// Indica se o token foi revogado (propriedade calculada).
    /// </summary>
    public bool isRevoked => RevokedAt != null;

    /// <summary>
    /// Indica se o token está ativo (não revogado e não expirado).
    /// </summary>
    public bool isActive => RevokedAt == null && !isExpired;
}