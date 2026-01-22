using System.Net;
using System.Net.Http.Json;
using System.Web;
using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

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
    public async Task Register_DuplicateEmail_Returns_BadRequest()
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
}
