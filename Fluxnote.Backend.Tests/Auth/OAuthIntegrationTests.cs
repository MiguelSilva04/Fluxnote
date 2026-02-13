using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Fluxnote.Backend.Tests.Auth;

public class OAuthIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public OAuthIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ExternalLogin_InvalidProvider_ReturnsBadRequest()
    {
        // Act
        var response = await _client.GetAsync("/api/auth/external-login/invalid-provider");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task LinkExternalLogin_InvalidProvider_ReturnsBadRequest_ForAuthenticatedUser()
    {
        // Arrange
        var accessToken = await RegisterConfirmAndLoginAsync("oauth-link-invalid@test.com");
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);

        // Act
        var response = await authenticatedClient.PostAsync("/api/auth/link-external/invalid-provider", null);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetExternalLogins_LocalUser_ReturnsNoLinkedProviders_AndBothAvailable()
    {
        // Arrange
        var accessToken = await RegisterConfirmAndLoginAsync("oauth-logins@test.com");
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);

        // Act
        var response = await authenticatedClient.GetAsync("/api/auth/external-logins");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.TryGetProperty("linkedProviders", out var linkedProviders));
        Assert.Equal(JsonValueKind.Array, linkedProviders.ValueKind);
        Assert.Equal(0, linkedProviders.GetArrayLength());

        Assert.True(body.TryGetProperty("availableProviders", out var availableProviders));
        var providers = availableProviders.EnumerateArray()
            .Select(x => x.GetString())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        Assert.Contains("Google", providers);
        Assert.Contains("Microsoft", providers);
    }

    [Fact]
    public async Task UnlinkExternalLogin_WhenProviderNotLinked_ReturnsNotFound()
    {
        // Arrange
        var accessToken = await RegisterConfirmAndLoginAsync("oauth-unlink-notfound@test.com");
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);

        // Act
        var response = await authenticatedClient.DeleteAsync("/api/auth/unlink-external/google");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task SetPassword_ForLocalUserWithPassword_ReturnsBadRequest()
    {
        // Arrange
        var accessToken = await RegisterConfirmAndLoginAsync("oauth-set-password@test.com");
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);
        var payload = new SetPasswordRequest
        {
            NewPassword = "AnotherPassword123!"
        };

        // Act
        var response = await authenticatedClient.PostAsJsonAsync("/api/auth/set-password", payload);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<string?> RegisterConfirmAndLoginAsync(string email)
    {
        const string password = "Teste1234!";

        using (var scope = _factory.Services.CreateScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
            var existing = await userManager.FindByEmailAsync(email);
            if (existing is null)
            {
                var create = await userManager.CreateAsync(new User
                {
                    Email = email,
                    UserName = email,
                    FullName = "OAuth Integration Test User",
                    EmailConfirmed = true,
                    AccountStatus = AccountStatus.Active,
                    AuthProvider = AuthProvider.Local,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }, password);

                Assert.True(create.Succeeded, $"User creation failed: {string.Join(", ", create.Errors.Select(e => e.Description))}");
            }
        }

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = password,
            RememberMe = false
        });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var body = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        return body?.AccessToken;
    }

    private HttpClient CreateAuthenticatedClient(string accessToken)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = _client.BaseAddress!
        });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }
}
