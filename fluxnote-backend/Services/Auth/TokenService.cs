using Fluxnote.Backend.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Fluxnote.Backend.Services.Auth;

public class TokenService
{
    private readonly IConfiguration _config;
    public TokenService(IConfiguration config)
    {
        _config = config;
    }
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

    public static string GenerateRefreshTokenPlain()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    public static string HashRefreshToken(string refreshTokenPlain)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(refreshTokenPlain));
        return Convert.ToBase64String(bytes);
    }
}
