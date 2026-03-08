namespace Fluxnote.Backend.Contracts.Auth;

/// <summary>
/// DTO para pedido de registo de novo utilizador.
/// Usado no endpoint POST /api/auth/register.
/// </summary>
/// <remarks>
/// <b>Validações (via FluentValidation):</b>
/// <list type="bullet">
///     <item><description><b>Email:</b> Obrigatório, formato válido, único no sistema</description></item>
///     <item><description><b>FullName:</b> Obrigatório, 2-100 caracteres</description></item>
///     <item><description><b>Password:</b> Mínimo 8 caracteres, maiúscula, minúscula, dígito, especial</description></item>
/// </list>
/// <b>Fluxo após registo:</b>
/// <list type="number">
///     <item><description>Conta criada com AccountStatus.PendingEmailConfirmation</description></item>
///     <item><description>Email de confirmação enviado</description></item>
///     <item><description>Utilizador clica no link do email</description></item>
///     <item><description>Conta ativada (AccountStatus.Active)</description></item>
///     <item><description>Login disponível</description></item>
/// </list>
/// </remarks>
public class RegisterRequest
{
    /// <summary>
    /// Endereço de email para a conta (será usado como login).
    /// </summary>
    /// <remarks>Deve ser único no sistema.</remarks>
    /// <example>user@example.com</example>
    public string Email { get; set; } = default!;

    /// <summary>
    /// Password para a conta.
    /// </summary>
    /// <remarks>
    /// Requisitos: 8+ caracteres, 1 maiúscula, 1 minúscula, 1 dígito, 1 especial.
    /// </remarks>
    public string Password { get; set; } = default!;

    /// <summary>
    /// Nome completo do utilizador para exibição.
    /// </summary>
    /// <example>João Silva</example>
    public string FullName { get; set; } = default!;

    /// <summary>
    /// Idioma preferido do utilizador para emails ("en" ou "pt").
    /// </summary>
    /// <example>pt</example>
    public string Lang { get; set; } = "en";
}
