using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Web;

namespace Fluxnote.Backend.Tests.Auth;

public class UserProfileIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public UserProfileIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // ==================== GET /api/auth/users/me TESTS ====================

    [Fact]
    public async Task GetMe_ValidToken_Returns_UserProfile()
    {
        // Arrange
        var email = "getme-valid@test.com";
        var password = "eTeste1234!";
        var fullName = "Get Me User";
        await CreateAndConfirmUserAsync(email, password, fullName);

        var accessToken = await LoginAndGetAccessTokenAsync(email, password);
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);

        // Act
        var resp = await authenticatedClient.GetAsync("/api/auth/users/me");

        // Assert
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var profile = await resp.Content.ReadFromJsonAsync<UserProfile>();
        Assert.NotNull(profile);
        Assert.Equal(email, profile!.Email);
        Assert.Equal(fullName, profile.FullName);
        Assert.Equal(email, profile.UserName);
    }

    [Fact]
    public async Task GetMe_NoToken_Returns_Unauthorized()
    {
        // Act
        var resp = await _client.GetAsync("/api/auth/users/me");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task GetMe_InvalidToken_Returns_Unauthorized()
    {
        // Arrange
        var clientWithInvalidToken = CreateAuthenticatedClient("invalid-token-here");

        // Act
        var resp = await clientWithInvalidToken.GetAsync("/api/auth/users/me");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // ==================== PUT /api/auth/users/me TESTS ====================

    [Fact]
    public async Task UpdateProfile_ValidData_Updates_And_Returns_Profile()
    {
        // Arrange
        var email = "update-profile@test.com";
        var password = "eTeste1234!";
        await CreateAndConfirmUserAsync(email, password, "Original Name");

        var accessToken = await LoginAndGetAccessTokenAsync(email, password);
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);

        var updateRequest = new UpdateProfileRequest
        {
            FullName = "Updated Name",
            Location = "Lisbon, Portugal",
            PhoneNumber = "+351912345678"
        };

        // Act
        var resp = await authenticatedClient.PutAsJsonAsync("/api/auth/users/me", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var profile = await resp.Content.ReadFromJsonAsync<UserProfile>();
        Assert.NotNull(profile);
        Assert.Equal("Updated Name", profile!.FullName);
        Assert.Equal("Lisbon, Portugal", profile.Location);
        Assert.Equal("+351912345678", profile.PhoneNumber);

        // Verify persistence by fetching profile again
        var getResp = await authenticatedClient.GetAsync("/api/auth/users/me");
        var fetchedProfile = await getResp.Content.ReadFromJsonAsync<UserProfile>();
        Assert.Equal("Updated Name", fetchedProfile!.FullName);
    }

    [Fact]
    public async Task UpdateProfile_PartialUpdate_Only_Updates_Provided_Fields()
    {
        // Arrange
        var email = "partial-update@test.com";
        var password = "eTeste1234!";
        await CreateAndConfirmUserAsync(email, password, "Original Name");

        var accessToken = await LoginAndGetAccessTokenAsync(email, password);
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);

        // First, set location
        await authenticatedClient.PutAsJsonAsync("/api/auth/users/me", new UpdateProfileRequest
        {
            Location = "Porto, Portugal"
        });

        // Now, only update phone number
        var updateRequest = new UpdateProfileRequest
        {
            PhoneNumber = "+351999999999"
        };

        // Act
        var resp = await authenticatedClient.PutAsJsonAsync("/api/auth/users/me", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var profile = await resp.Content.ReadFromJsonAsync<UserProfile>();
        Assert.NotNull(profile);
        Assert.Equal("Original Name", profile!.FullName); // Should remain unchanged
        Assert.Equal("Porto, Portugal", profile.Location); // Should remain unchanged
        Assert.Equal("+351999999999", profile.PhoneNumber); // Should be updated
    }

    [Fact]
    public async Task UpdateProfile_ProfilePictureUrl_Updates_Successfully()
    {
        // Arrange
        var email = "profile-pic@test.com";
        var password = "eTeste1234!";
        await CreateAndConfirmUserAsync(email, password, "Picture User");

        var accessToken = await LoginAndGetAccessTokenAsync(email, password);
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);

        var updateRequest = new UpdateProfileRequest
        {
            ProfilePictureUrl = "https://example.com/avatar.jpg"
        };

        // Act
        var resp = await authenticatedClient.PutAsJsonAsync("/api/auth/users/me", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var profile = await resp.Content.ReadFromJsonAsync<UserProfile>();
        Assert.NotNull(profile);
        Assert.Equal("https://example.com/avatar.jpg", profile!.ProfilePictureUrl);
    }

    [Fact]
    public async Task UpdateProfile_NoToken_Returns_Unauthorized()
    {
        // Arrange
        var updateRequest = new UpdateProfileRequest
        {
            FullName = "Hacker"
        };

        // Act
        var resp = await _client.PutAsJsonAsync("/api/auth/users/me", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // ==================== PUT /api/auth/users/me/password TESTS ====================

    [Fact]
    public async Task ChangePassword_ValidData_Changes_Password_Successfully()
    {
        // Arrange
        var email = "change-pwd@test.com";
        var oldPassword = "eTeste1234!";
        var newPassword = "NewPassword123!";
        await CreateAndConfirmUserAsync(email, oldPassword, "Password User");

        var accessToken = await LoginAndGetAccessTokenAsync(email, oldPassword);
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);

        var changePasswordRequest = new ChangePasswordRequest
        {
            CurrentPassword = oldPassword,
            NewPassword = newPassword,
            ConfirmPassword = newPassword
        };

        // Act
        var resp = await authenticatedClient.PutAsJsonAsync("/api/auth/users/me/password", changePasswordRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        // Verify old password no longer works
        var oldLoginResp = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = oldPassword,
            RememberMe = false
        });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLoginResp.StatusCode);

        // Verify new password works
        var newLoginResp = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = newPassword,
            RememberMe = false
        });
        Assert.Equal(HttpStatusCode.OK, newLoginResp.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_Returns_BadRequest()
    {
        // Arrange
        var email = "wrong-current-pwd@test.com";
        var password = "eTeste1234!";
        await CreateAndConfirmUserAsync(email, password, "Wrong Current User");

        var accessToken = await LoginAndGetAccessTokenAsync(email, password);
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);

        var changePasswordRequest = new ChangePasswordRequest
        {
            CurrentPassword = "WrongPassword!",
            NewPassword = "NewPassword123!",
            ConfirmPassword = "NewPassword123!"
        };

        // Act
        var resp = await authenticatedClient.PutAsJsonAsync("/api/auth/users/me/password", changePasswordRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_PasswordsDoNotMatch_Returns_BadRequest()
    {
        // Arrange
        var email = "mismatch-pwd@test.com";
        var password = "eTeste1234!";
        await CreateAndConfirmUserAsync(email, password, "Mismatch User");

        var accessToken = await LoginAndGetAccessTokenAsync(email, password);
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);

        var changePasswordRequest = new ChangePasswordRequest
        {
            CurrentPassword = password,
            NewPassword = "NewPassword123!",
            ConfirmPassword = "DifferentPassword123!"
        };

        // Act
        var resp = await authenticatedClient.PutAsJsonAsync("/api/auth/users/me/password", changePasswordRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WeakPassword_Returns_BadRequest()
    {
        // Arrange
        var email = "weak-pwd@test.com";
        var password = "eTeste1234!";
        await CreateAndConfirmUserAsync(email, password, "Weak Password User");

        var accessToken = await LoginAndGetAccessTokenAsync(email, password);
        var authenticatedClient = CreateAuthenticatedClient(accessToken!);

        var changePasswordRequest = new ChangePasswordRequest
        {
            CurrentPassword = password,
            NewPassword = "weak", // Too short, no special chars, no numbers
            ConfirmPassword = "weak"
        };

        // Act
        var resp = await authenticatedClient.PutAsJsonAsync("/api/auth/users/me/password", changePasswordRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_NoToken_Returns_Unauthorized()
    {
        // Arrange
        var changePasswordRequest = new ChangePasswordRequest
        {
            CurrentPassword = "OldPassword123!",
            NewPassword = "NewPassword123!",
            ConfirmPassword = "NewPassword123!"
        };

        // Act
        var resp = await _client.PutAsJsonAsync("/api/auth/users/me/password", changePasswordRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // ==================== HELPER METHODS ====================

    private async Task CreateAndConfirmUserAsync(string email, string password, string fullName = "Test User")
    {
        var registerRequest = new RegisterRequest
        {
            Email = email,
            Password = password,
            FullName = fullName
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

    private async Task<string?> LoginAndGetAccessTokenAsync(string email, string password)
    {
        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = password,
            RememberMe = false
        };

        var resp = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        var content = await resp.Content.ReadAsStringAsync();

        if (!resp.IsSuccessStatusCode)
        {
            // Surface server response for easier debugging instead of attempting JSON deserialization on non-success responses.
            throw new InvalidOperationException($"Login failed with status {resp.StatusCode}. Response body: {content}");
        }

        try
        {
            // Prefer the built-in JSON reader when the server declares a JSON media type.
            var mediaType = resp.Content.Headers.ContentType?.MediaType;
            if (mediaType is "application/json" or "text/json" or "application/problem+json")
            {
                var body = await resp.Content.ReadFromJsonAsync<LoginResponse>();
                return body?.AccessToken;
            }

            // Fallback: attempt to deserialize the raw string (handles cases where server returns JSON without correct Content-Type).
            var bodyFallback = System.Text.Json.JsonSerializer.Deserialize<LoginResponse?>(content, new System.Text.Json.JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (bodyFallback is null)
                throw new InvalidOperationException($"Login returned unexpected body that could not be deserialized. Body: {content}");

            return bodyFallback.AccessToken;
        }
        catch (System.Text.Json.JsonException ex)
        {
            // Include the response body in the thrown exception to make the root cause obvious in test output.
            throw new InvalidOperationException($"Failed to parse login response as JSON. Body: {content}", ex);
        }
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
