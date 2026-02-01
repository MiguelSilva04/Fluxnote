using Fluxnote.Backend.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Fluxnote.Backend.Services.Auth;

/// <summary>
/// Serviço responsável pela geração e gestão de tokens de autenticação.
/// </summary>
/// <remarks>
/// <b>Funcionalidades:</b>
/// <list type="bullet">
///     <item><description>Geração de access tokens JWT</description></item>
///     <item><description>Geração de refresh tokens aleatórios</description></item>
///     <item><description>Hash de refresh tokens para armazenamento seguro</description></item>
/// </list>
///
/// <b>Configuração (appsettings.json):</b>
/// <code>
/// {
///     "Jwt": {
///         "Key": "CHAVE_SECRETA_256_BITS",
///         "Issuer": "Fluxnote",
///         "Audience": "Fluxnote",
///         "AccessTokenMinutes": 15
///     }
/// }
/// </code>
///
/// <b>Especificações de Segurança:</b>
/// <list type="bullet">
///     <item><description><b>Algoritmo JWT:</b> HMAC-SHA256 (simétrico)</description></item>
///     <item><description><b>Refresh Token:</b> 64 bytes aleatórios (512 bits de entropia)</description></item>
///     <item><description><b>Hash:</b> SHA256 para armazenamento de refresh tokens</description></item>
/// </list>
/// </remarks>
public class TokenService
{
    private readonly IConfiguration _config;

    /// <summary>
    /// Construtor com injeção de configuração.
    /// </summary>
    /// <param name="config">Configuração da aplicação para aceder às chaves JWT.</param>
    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    /// <summary>
    /// Cria um access token JWT para um utilizador autenticado.
    /// </summary>
    /// <param name="user">Utilizador para o qual criar o token.</param>
    /// <returns>Token JWT assinado em formato string.</returns>
    /// <remarks>
    /// <b>Claims incluídas no token:</b>
    /// <list type="bullet">
    ///     <item><description><b>sub (Subject):</b> User.Id - identificador único do utilizador</description></item>
    ///     <item><description><b>email:</b> User.Email - email do utilizador</description></item>
    ///     <item><description><b>name:</b> User.FullName ou UserName - nome para exibição</description></item>
    /// </list>
    /// <b>Expiração:</b> Configurável via Jwt:AccessTokenMinutes (padrão: 15 minutos)<br/>
    /// <b>Assinatura:</b> HMAC-SHA256 com chave simétrica de Jwt:Key
    /// </remarks>
    public string CreateAccessToken(User user)
    {
        var key = _config["Jwt:Key"]!;
        var issuer = _config["Jwt:Issuer"]!;
        var audience = _config["Jwt:Audience"]!;
        var minutes = int.Parse(_config["Jwt:AccessTokenMinutes"] ?? "15");

        // criar claims do user para o token JWT
        // as claims são pedaços de informação sobre o user
        // que podem ser usadas pela aplicação
        // aqui estamos a usar o Id, Email e Nome
        var claims = new List<Claim>
        {
            new (JwtRegisteredClaimNames.Sub, user.Id),
            new (JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new("name", user.FullName ?? user.UserName ?? "")
        };

        // criar o token JWT
        // usar HMAC SHA256 com uma chave simétrica
        // as creds são usadas para assinar o token
        // isto garante que o token não foi alterado
        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256
        );

        // criar o token JWT propriamente dito
        // definir emissor, audiência, claims, expiração e credenciais de assinatura
        // o token vai expirar em "minutes" minutos
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(minutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Gera um refresh token aleatório em texto plano.
    /// </summary>
    /// <returns>Token de 64 bytes aleatórios codificado em Base64 (86 caracteres).</returns>
    /// <remarks>
    /// <b>Segurança:</b>
    /// <list type="bullet">
    ///     <item><description>Usa RandomNumberGenerator criptograficamente seguro</description></item>
    ///     <item><description>64 bytes = 512 bits de entropia (resistente a brute force)</description></item>
    ///     <item><description>Este valor é enviado ao cliente via cookie HttpOnly</description></item>
    ///     <item><description>NUNCA armazenar este valor na base de dados - usar HashRefreshToken</description></item>
    /// </list>
    /// </remarks>
    public static string GenerateRefreshTokenPlain()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    /// <summary>
    /// Calcula o hash SHA256 de um refresh token para armazenamento seguro.
    /// </summary>
    /// <param name="refreshTokenPlain">Token em texto plano (do cliente).</param>
    /// <returns>Hash SHA256 do token em Base64 (44 caracteres).</returns>
    /// <remarks>
    /// <b>Uso:</b>
    /// <list type="bullet">
    ///     <item><description>SEMPRE usar este hash para armazenar na base de dados</description></item>
    ///     <item><description>SEMPRE usar este hash para pesquisar na base de dados</description></item>
    ///     <item><description>Se a BD for comprometida, os tokens continuam seguros</description></item>
    /// </list>
    /// <b>Processo de Validação:</b>
    /// <list type="number">
    ///     <item><description>Cliente envia token via cookie</description></item>
    ///     <item><description>Servidor calcula hash do token recebido</description></item>
    ///     <item><description>Servidor pesquisa na BD pelo hash</description></item>
    ///     <item><description>Se encontrar e estiver válido, aceita a autenticação</description></item>
    /// </list>
    /// </remarks>
    public static string HashRefreshToken(string refreshTokenPlain)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(refreshTokenPlain));
        return Convert.ToBase64String(bytes);
    }
}
