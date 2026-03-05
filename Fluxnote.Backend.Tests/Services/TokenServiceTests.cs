using System.IdentityModel.Tokens.Jwt;
using System.Text;
using FluentAssertions;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Services.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Fluxnote.Backend.Tests.Services;

public class TokenServiceTests
{
    private static TokenService CreateService(int minutes = 15) =>
        new(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"]                = "supersecretkey_for_tests_32chars!!",
                ["Jwt:Issuer"]             = "TestIssuer",
                ["Jwt:Audience"]           = "TestAudience",
                ["Jwt:AccessTokenMinutes"] = minutes.ToString()
            })
            .Build());

    private static User TestUser() => new()
    {
        Id       = "user-123",
        Email    = "test@example.com",
        UserName = "testuser",
        FullName = "Test User"
    };

    // ─── CreateAccessToken ────────────────────────────────────

    [Fact]
    public void CreateAccessToken_ReturnsNonEmptyString()
    {
        var token = CreateService().CreateAccessToken(TestUser());
        token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void CreateAccessToken_ContainsSubClaim_EqualToUserId()
    {
        var user  = TestUser();
        var token = CreateService().CreateAccessToken(user);
        var jwt   = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value
           .Should().Be(user.Id);
    }

    [Fact]
    public void CreateAccessToken_ContainsEmailClaim()
    {
        var user  = TestUser();
        var token = CreateService().CreateAccessToken(user);
        var jwt   = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Email)?.Value
           .Should().Be(user.Email);
    }

    [Fact]
    public void CreateAccessToken_ContainsNameClaim_EqualToFullName()
    {
        var user  = TestUser();
        var token = CreateService().CreateAccessToken(user);
        var jwt   = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.FirstOrDefault(c => c.Type == "name")?.Value
           .Should().Be(user.FullName);
    }

    [Fact]
    public void CreateAccessToken_WhenFullNameNull_UsesUserName()
    {
        var user = TestUser(); user.FullName = null;
        var token = CreateService().CreateAccessToken(user);
        var jwt   = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.FirstOrDefault(c => c.Type == "name")?.Value
           .Should().Be(user.UserName);
    }

    [Fact]
    public void CreateAccessToken_HasCorrectIssuer()
    {
        var jwt = new JwtSecurityTokenHandler()
            .ReadJwtToken(CreateService().CreateAccessToken(TestUser()));

        jwt.Issuer.Should().Be("TestIssuer");
    }

    [Fact]
    public void CreateAccessToken_ExpiresInConfiguredMinutes()
    {
        var svc   = CreateService(minutes: 30);
        var before = DateTime.UtcNow.AddMinutes(29);
        var token = svc.CreateAccessToken(TestUser());
        var after  = DateTime.UtcNow.AddMinutes(31);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.ValidTo.Should().BeAfter(before).And.BeBefore(after);
    }

    [Fact]
    public void CreateAccessToken_IsValidWithCorrectKey()
    {
        var token = CreateService().CreateAccessToken(TestUser());

        var p = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes("supersecretkey_for_tests_32chars!!")),
            ValidateIssuer   = true, ValidIssuer   = "TestIssuer",
            ValidateAudience = true, ValidAudience = "TestAudience",
            ValidateLifetime = true, ClockSkew     = TimeSpan.Zero
        };

        var act = () => new JwtSecurityTokenHandler().ValidateToken(token, p, out _);
        act.Should().NotThrow();
    }

    // ─── GenerateRefreshTokenPlain ────────────────────────────

    [Fact]
    public void GenerateRefreshTokenPlain_ReturnsNonEmptyString()
    {
        TokenService.GenerateRefreshTokenPlain().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void GenerateRefreshTokenPlain_IsBase64Of64Bytes()
    {
        var bytes = Convert.FromBase64String(TokenService.GenerateRefreshTokenPlain());
        bytes.Should().HaveCount(64);
    }

    [Fact]
    public void GenerateRefreshTokenPlain_ReturnsDifferentTokensEachTime()
    {
        TokenService.GenerateRefreshTokenPlain()
            .Should().NotBe(TokenService.GenerateRefreshTokenPlain());
    }

    // ─── HashRefreshToken ─────────────────────────────────────

    [Fact]
    public void HashRefreshToken_ReturnsNonEmptyString()
    {
        TokenService.HashRefreshToken("some-token").Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void HashRefreshToken_IsDeterministic()
    {
        TokenService.HashRefreshToken("token-abc")
            .Should().Be(TokenService.HashRefreshToken("token-abc"));
    }

    [Fact]
    public void HashRefreshToken_DifferentInputsProduceDifferentHashes()
    {
        TokenService.HashRefreshToken("token-aaa")
            .Should().NotBe(TokenService.HashRefreshToken("token-bbb"));
    }

    [Fact]
    public void HashRefreshToken_ProducesSHA256Length_32Bytes()
    {
        var bytes = Convert.FromBase64String(TokenService.HashRefreshToken("any-token"));
        bytes.Should().HaveCount(32); // SHA-256 = 256 bits = 32 bytes
    }
}
