using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using NuGet.Protocol.Plugins;
using System.Net;
using System.Net.Http.Json;
using System.Web;

namespace Fluxnote.Backend.Tests.Auth;

public class AuthIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_Creates_User_With_PendingEmailConfirmation_And_Sends_Link()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "miguel@test.com",
            Password = "Teste1234!",
            FullName = "Miguel Teste"
        };

        // Act
        var resp = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert - HTTP
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        // Assert - Email link captured
        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        Assert.NotNull(emailSender.LastConfirmationLink);
        Assert.Contains("/confirm-email?userId=", emailSender.LastConfirmationLink);

        // Assert - DB state
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

        var user = db.Users.SingleOrDefault(u => u.Email == request.Email);
        Assert.NotNull(user);
        Assert.False(user!.EmailConfirmed);
        Assert.Equal(AccountStatus.PendingEmailConfirmation, user.AccountStatus);
        Assert.Equal(AuthProvider.Local, user.AuthProvider);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns_Conflict()
    {
        // Arrange
        var request = new RegisterRequest
        {
            Email = "dup@test.com",
            Password = "Teste1234!",
            FullName = "Dup User"
        };

        // Act
        var resp1 = await _client.PostAsJsonAsync("/api/auth/register", request);
        var resp2 = await _client.PostAsJsonAsync("/api/auth/register", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, resp2.StatusCode);
    }

    [Fact]
    public async Task ConfirmEmail_ValidToken_Activates_User()
    {
        // Arrange: register
        var request = new RegisterRequest
        {
            Email = "confirm@test.com",
            Password = "Teste1234!",
            FullName = "Confirm User"
        };

        var registerResp = await _client.PostAsJsonAsync("/api/auth/register", request);
        Assert.Equal(HttpStatusCode.OK, registerResp.StatusCode);

        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        var link = emailSender.LastConfirmationLink;
        Assert.NotNull(link);

        // Parse userId + token from captured link
        var uri = new Uri(link!);
        var qs = HttpUtility.ParseQueryString(uri.Query);
        var userId = qs["userId"];
        var token = qs["token"];

        Assert.False(string.IsNullOrWhiteSpace(userId));
        Assert.False(string.IsNullOrWhiteSpace(token));

        // Act: confirm
        var confirmResp = await _client.GetAsync($"/api/auth/confirm-email?userId={Uri.EscapeDataString(userId!)}&token={Uri.EscapeDataString(token!)}");

        // Assert HTTP
        Assert.Equal(HttpStatusCode.OK, confirmResp.StatusCode);

        // Assert DB state
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

        var user = db.Users.Single(u => u.Email == request.Email);
        Assert.True(user.EmailConfirmed);
        Assert.Equal(AccountStatus.Active, user.AccountStatus);
    }

    // ==================== LOGIN TESTS ====================

    [Fact]
    public async Task Login_ValidCredentials_Returns_AccessToken_And_Sets_RefreshCookie()
    {
        // Arrange: create and confirm user
        var email = "login-valid@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = "Teste1234!",
            RememberMe = false
        };

        // Act
        var resp = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.AccessToken));
        Assert.True(body.ExpiresInSeconds > 0);

        // Assert refresh cookie was set
        Assert.True(resp.Headers.Contains("Set-Cookie"));
        var setCookie = resp.Headers.GetValues("Set-Cookie").FirstOrDefault();
        Assert.True(resp.Headers.TryGetValues("Set-Cookie", out var setCookies));
        var all = string.Join("\n", setCookies);

        Assert.Contains("fluxnote_rt=", all);
        Assert.Contains("httponly", all, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_InvalidPassword_Returns_Unauthorized()
    {
        // Arrange
        var email = "login-wrongpass@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = "WrongPassword!",
            RememberMe = false
        };

        // Act
        var resp = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Login_UnconfirmedEmail_Returns_Forbidden()
    {
        // Arrange: register but don't confirm
        var request = new RegisterRequest
        {
            Email = "login-unconfirmed@test.com",
            Password = "Teste1234!",
            FullName = "Unconfirmed User"
        };
        await _client.PostAsJsonAsync("/api/auth/register", request);

        var loginRequest = new LoginRequest
        {
            Email = request.Email,
            Password = request.Password,
            RememberMe = false
        };

        // Act
        var resp = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [Fact]
    public async Task Login_NonExistentUser_Returns_Conflict()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "nonexistent@test.com",
            Password = "Teste1234!",
            RememberMe = false
        };

        // Act
        var resp = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // ==================== REFRESH TESTS ====================

    [Fact]
    public async Task Refresh_ValidToken_Returns_NewAccessToken_And_RotatesRefreshToken()
    {
        // Arrange: login to get tokens
        var email = "refresh-valid@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        var (accessToken, refreshCookie) = await LoginAndGetTokensAsync(email, "Teste1234!");
        Assert.NotNull(refreshCookie);

        // Create client with cookie
        var clientWithCookie = CreateClientWithCookie(refreshCookie!);

        // Act
        var resp = await clientWithCookie.PostAsync("/api/auth/refresh", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<TokenResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.AccessToken));

        // New refresh cookie should be different (rotation)
        var newSetCookie = resp.Headers.GetValues("Set-Cookie").FirstOrDefault();
        Assert.NotNull(newSetCookie);
        Assert.Contains("fluxnote_rt=", newSetCookie);
    }

    [Fact]
    public async Task Refresh_MissingCookie_Returns_Unauthorized()
    {
        // Act - no cookie
        var resp = await _client.PostAsync("/api/auth/refresh", null);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Refresh_InvalidToken_Returns_Unauthorized()
    {
        // Arrange: client with fake cookie
        var clientWithFakeCookie = CreateClientWithCookie("fluxnote_rt=invalidtoken123");

        // Act
        var resp = await clientWithFakeCookie.PostAsync("/api/auth/refresh", null);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Refresh_RevokedToken_Returns_Conflict_And_RevokesSession()
    {
        // Arrange: login twice to get two tokens for same session
        var email = "refresh-reuse@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        var (_, refreshCookie1) = await LoginAndGetTokensAsync(email, "Teste1234!");
        var client1 = CreateClientWithCookie(refreshCookie1!);

        // First refresh - should work and rotate
        var resp1 = await client1.PostAsync("/api/auth/refresh", null);
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);

        // Act: try to reuse old token (simulates theft)
        var resp2 = await client1.PostAsync("/api/auth/refresh", null);

        // Assert: reuse detection
        Assert.Equal(HttpStatusCode.Unauthorized, resp2.StatusCode);
    }

    // ==================== LOGOUT TESTS ====================

    [Fact]
    public async Task Logout_ValidSession_Clears_Cookie_And_RevokesToken()
    {
        // Arrange
        var email = "logout-valid@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        var (_, refreshCookie) = await LoginAndGetTokensAsync(email, "Teste1234!");
        var clientWithCookie = CreateClientWithCookie(refreshCookie!);

        // Act
        var resp = await clientWithCookie.PostAsync("/api/auth/logout", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        // Cookie should be cleared
        var setCookie = resp.Headers.GetValues("Set-Cookie").FirstOrDefault();
        Assert.NotNull(setCookie);

        // Try to refresh with old cookie - should fail
        var refreshResp = await clientWithCookie.PostAsync("/api/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, refreshResp.StatusCode);
    }

    [Fact]
    public async Task Logout_NoCookie_Returns_Ok_Idempotent()
    {
        // Act - logout without being logged in
        var resp = await _client.PostAsync("/api/auth/logout", null);

        // Assert - should still return OK (idempotent)
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task LogoutAll_RevokesAllSessionTokens()
    {
        // Arrange: login from two "devices" (same user, different sessions)
        var email = "logout-all@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        var (_, refreshCookie1) = await LoginAndGetTokensAsync(email, "Teste1234!");
        var (_, refreshCookie2) = await LoginAndGetTokensAsync(email, "Teste1234!");

        var client1 = CreateClientWithCookie(refreshCookie1!);
        var client2 = CreateClientWithCookie(refreshCookie2!);

        // Act: logout-all from client1
        var logoutResp = await client1.PostAsync("/api/auth/logout-all", null);
        Assert.Equal(HttpStatusCode.OK, logoutResp.StatusCode);

        // Assert: both sessions should be revoked
        var refresh1 = await client1.PostAsync("/api/auth/refresh", null);
        var refresh2 = await client2.PostAsync("/api/auth/refresh", null);

        Assert.Equal(HttpStatusCode.Unauthorized, refresh1.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, refresh2.StatusCode);
    }

    [Fact]
    public async Task Logout_ValidSession_ClearsCookie_And_RevokesToken()
    {
        var email = "logout-valid@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        var (_, refreshCookie) = await LoginAndGetTokensAsync(email, "Teste1234!");
        var client1 = CreateClientWithCookie(refreshCookie!);

        var resp = await client1.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var setCookie = resp.Headers.GetValues("Set-Cookie").FirstOrDefault();
        Assert.NotNull(setCookie);
        // tipicamente contém "expires=" ou "Max-Age=0"
        Assert.Contains("fluxnote_rt=", setCookie);

        // Simula tentativa de reuse com cookie antigo (novo client)
        var attackerClient = CreateClientWithCookie(refreshCookie!);
        var refreshResp = await attackerClient.PostAsync("/api/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, refreshResp.StatusCode);
    }


    // ==================== HELPER METHODS ====================

    private async Task CreateAndConfirmUserAsync(string email, string password)
    {
        var registerRequest = new RegisterRequest
        {
            Email = email,
            Password = password,
            FullName = "Test User"
        };

        await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        var link = emailSender.LastConfirmationLink;

        if (link != null)
        {
            var uri = new Uri(link);
            var qs = HttpUtility.ParseQueryString(uri.Query);
            var userId = qs["userId"];
            var token = qs["token"];

            await _client.GetAsync($"/api/auth/confirm-email?userId={Uri.EscapeDataString(userId!)}&token={Uri.EscapeDataString(token!)}");
        }
    }

    private async Task<(string? AccessToken, string? RefreshCookie)> LoginAndGetTokensAsync(string email, string password)
    {
        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = password,
            RememberMe = false
        };

        var resp = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        var body = await resp.Content.ReadFromJsonAsync<LoginResponse>();
        var setCookie = resp.Headers.TryGetValues("Set-Cookie", out var cookies)
            ? cookies.FirstOrDefault()
            : null;

        return (body?.AccessToken, setCookie);
    }

    private HttpClient CreateClientWithCookie(string setCookieHeader)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = _client.BaseAddress!
        });

        // Extrai apenas "fluxnote_rt=...."
        var cookiePair = setCookieHeader.Split(';', 2)[0];

        // Remove header anterior se existir
        client.DefaultRequestHeaders.Remove("Cookie");
        client.DefaultRequestHeaders.Add("Cookie", cookiePair);

        return client;
    }

}
