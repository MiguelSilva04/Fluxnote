/// <summary>
/// Interface para armazenamento de links de confirmação de email em desenvolvimento.
/// </summary>
/// <remarks>
/// <b>⚠️ APENAS PARA DESENVOLVIMENTO</b><br/>
/// Permite guardar e recuperar links de confirmação para testes.
/// </remarks>
public interface IDevEmailStore
{
    /// <summary>
    /// Guarda um link de confirmação para um email.
    /// </summary>
    /// <param name="email">Email do utilizador.</param>
    /// <param name="confirmationLink">Link de confirmação completo.</param>
    /// <remarks>Sobrescreve links anteriores para o mesmo email.</remarks>
    void Save(string email, string confirmationLink);

    /// <summary>
    /// Obtém o último link de confirmação guardado para um email.
    /// </summary>
    /// <param name="email">Email do utilizador (case-insensitive).</param>
    /// <returns>Link de confirmação ou null se não existir.</returns>
    string? Get(string email);
}

/// <summary>
/// Implementação em memória de IDevEmailStore.
/// </summary>
/// <remarks>
/// <b>⚠️ APENAS PARA DESENVOLVIMENTO</b>
///
/// <b>Características:</b>
/// <list type="bullet">
///     <item><description>Armazenamento em dicionário em memória</description></item>
///     <item><description>Comparação de email case-insensitive</description></item>
///     <item><description>Dados perdidos ao reiniciar a aplicação</description></item>
///     <item><description>Guarda apenas o último link por email</description></item>
/// </list>
///
/// <b>Uso Típico:</b>
/// <list type="number">
///     <item><description>Utilizador regista-se via POST /auth/register</description></item>
///     <item><description>ConsoleEmailSender guarda link via Save()</description></item>
///     <item><description>Testes automatizados obtêm link via GET /auth/dev/last-confirmation-link</description></item>
///     <item><description>Link é usado para confirmar email</description></item>
/// </list>
///
/// <b>Registo em Program.cs:</b>
/// <code>services.AddSingleton&lt;IDevEmailStore, DevEmailStore&gt;();</code>
/// </remarks>
public class DevEmailStore : IDevEmailStore
{
    private readonly Dictionary<string, string> _store = new(StringComparer.OrdinalIgnoreCase);

    /// <inheritdoc/>
    public void Save(string email, string confirmationLink) => _store[email] = confirmationLink;

    /// <inheritdoc/>
    public string? Get(string email) => _store.TryGetValue(email, out var link) ? link : null;
}
