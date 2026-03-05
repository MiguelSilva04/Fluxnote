using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using System.Web;

namespace Fluxnote.Backend.Tests.Auth;

public class PasswordResetIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public PasswordResetIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // ======================================================================
    // FORGOT PASSWORD
    // ======================================================================

    [Fact]
    public async Task ForgotPassword_ExistingUser_Sends_ResetLink()
    {
        // Arrange: create and confirm a user
        var email = "reset-sends@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        // Act
        var resp = await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest { Email = email });

        // Assert
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        Assert.NotNull(emailSender.LastResetLink);
        Assert.Contains("/reset-password?userId=", emailSender.LastResetLink);
        Assert.Contains("&token=", emailSender.LastResetLink);
    }

    [Fact]
    public async Task ForgotPassword_NonExistentEmail_Returns_OK_NoLeak()
    {
        // Act: request reset for non-existent email
        var resp = await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest { Email = "doesnotexist@test.com" });

        // Assert: always 200 to avoid email enumeration
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task ForgotPassword_UnconfirmedEmail_Returns_OK_NoLeak()
    {
        // Arrange: register but DO NOT confirm
        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = "unconfirmed-reset@test.com",
            Password = "Teste1234!",
            FullName = "Unconfirmed"
        });

        // Act
        var resp = await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest { Email = "unconfirmed-reset@test.com" });

        // Assert: same 200
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    // ======================================================================
    // RESET PASSWORD
    // ======================================================================

    [Fact]
    public async Task ResetPassword_ValidToken_Resets_Successfully()
    {
        // Arrange
        var email = "reset-valid@test.com";
        var originalPassword = "Teste1234!";
        var newPassword = "NewPass1234!";
        await CreateAndConfirmUserAsync(email, originalPassword);

        // Request forgot password
        await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest { Email = email });

        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        var (userId, token) = ParseResetLink(emailSender.LastResetLink!);

        // Act
        var resp = await _client.PostAsJsonAsync("/api/auth/reset-password",
            new ResetPasswordRequest
            {
                UserId = userId,
                Token = token,
                NewPassword = newPassword,
                ConfirmPassword = newPassword
            });

        // Assert
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        // Verify: can login with new password
        var loginResp = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest { Email = email, Password = newPassword });
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);

        // Verify: cannot login with old password
        var oldLoginResp = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest { Email = email, Password = originalPassword });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLoginResp.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_InvalidToken_Returns_BadRequest()
    {
        // Arrange
        var email = "reset-invalid-token@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        // Get user ID
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var user = db.Users.Single(u => u.Email == email);

        // Act: use a fabricated invalid token
        var resp = await _client.PostAsJsonAsync("/api/auth/reset-password",
            new ResetPasswordRequest
            {
                UserId = user.Id,
                Token = "totally-invalid-token-abc123",
                NewPassword = "NewPass1234!",
                ConfirmPassword = "NewPass1234!"
            });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_TokenCannotBeReused()
    {
        // Arrange
        var email = "reset-reuse@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest { Email = email });

        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        var (userId, token) = ParseResetLink(emailSender.LastResetLink!);

        // Act 1: first reset succeeds
        var resp1 = await _client.PostAsJsonAsync("/api/auth/reset-password",
            new ResetPasswordRequest
            {
                UserId = userId,
                Token = token,
                NewPassword = "NewPass1234!",
                ConfirmPassword = "NewPass1234!"
            });
        Assert.Equal(HttpStatusCode.OK, resp1.StatusCode);

        // Act 2: same token again fails (token is single-use)
        var resp2 = await _client.PostAsJsonAsync("/api/auth/reset-password",
            new ResetPasswordRequest
            {
                UserId = userId,
                Token = token,
                NewPassword = "AnotherPass1!",
                ConfirmPassword = "AnotherPass1!"
            });

        // Assert: token is invalidated after use
        Assert.Equal(HttpStatusCode.BadRequest, resp2.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_InvalidUserId_Returns_BadRequest()
    {
        // Act
        var resp = await _client.PostAsJsonAsync("/api/auth/reset-password",
            new ResetPasswordRequest
            {
                UserId = "non-existent-user-id",
                Token = "some-token",
                NewPassword = "NewPass1234!",
                ConfirmPassword = "NewPass1234!"
            });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_WeakPassword_Returns_BadRequest()
    {
        // Arrange
        var email = "reset-weak@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest { Email = email });

        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        var (userId, token) = ParseResetLink(emailSender.LastResetLink!);

        // Act: try with a weak password
        var resp = await _client.PostAsJsonAsync("/api/auth/reset-password",
            new ResetPasswordRequest
            {
                UserId = userId,
                Token = token,
                NewPassword = "123",
                ConfirmPassword = "123"
            });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_InvalidatesAllExistingSessions()
    {
        // Arrange: create user and login to get a session
        var email = "reset-sessions@test.com";
        var password = "Teste1234!";
        await CreateAndConfirmUserAsync(email, password);

        // Login to create a session
        var loginResp = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest { Email = email, Password = password });
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);

        // Request forgot password and reset
        await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest { Email = email });

        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();
        var (userId, token) = ParseResetLink(emailSender.LastResetLink!);

        var resetResp = await _client.PostAsJsonAsync("/api/auth/reset-password",
            new ResetPasswordRequest
            {
                UserId = userId,
                Token = token,
                NewPassword = "NewSecure1234!",
                ConfirmPassword = "NewSecure1234!"
            });
        Assert.Equal(HttpStatusCode.OK, resetResp.StatusCode);

        // Assert: all refresh tokens for this user should be revoked
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
        var activeTokens = db.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToList();
        Assert.Empty(activeTokens);
    }

    [Fact]
    public async Task ResetPassword_EachRequestGeneratesUniqueToken()
    {
        // Arrange
        var email = "reset-unique@test.com";
        await CreateAndConfirmUserAsync(email, "Teste1234!");

        var emailSender = _factory.Services.GetRequiredService<TestEmailSender>();

        // Request 1
        await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest { Email = email });
        var link1 = emailSender.LastResetLink;

        // Request 2
        await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest { Email = email });
        var link2 = emailSender.LastResetLink;

        // Assert: different tokens generated
        Assert.NotNull(link1);
        Assert.NotNull(link2);
        var (_, token1) = ParseResetLink(link1!);
        var (_, token2) = ParseResetLink(link2!);
        Assert.NotEqual(token1, token2);
    }

    // ======================================================================
    // HELPERS
    // ======================================================================

    private (string UserId, string Token) ParseResetLink(string link)
    {
        var uri = new Uri(link);
        var qs = HttpUtility.ParseQueryString(uri.Query);
        var userId = qs["userId"] ?? throw new Exception("userId not found in reset link");
        var token = qs["token"] ?? throw new Exception("token not found in reset link");
        return (userId, token);
    }

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
}
