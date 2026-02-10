using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Dtos.Teams;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Web;

namespace Fluxnote.Backend.Tests.TeamTesting
{
    public class TeamIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public TeamIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetTeams_WithAuth_ReturnsOk()
        {
            // Arrange
            var email = $"team-get-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Act
            var response = await authClient.GetAsync("/api/teams");

            // Assert
            response.EnsureSuccessStatusCode();
            var teams = await response.Content.ReadFromJsonAsync<List<TeamDto>>();
            Assert.NotNull(teams);
        }

        [Fact]
        public async Task GetTeams_WithoutAuth_ReturnsUnauthorized()
        {
            // Act
            var response = await _client.GetAsync("/api/teams");

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task PostTeam_WithAuth_CreatesTeam()
        {
            // Arrange
            var email = $"team-post-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var team = new { Name = "Integration Test Team" };

            // Act
            var response = await authClient.PostAsJsonAsync("/api/teams", team);

            // Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var createdTeam = await response.Content.ReadFromJsonAsync<Team>();
            Assert.NotNull(createdTeam);
            Assert.Equal("Integration Test Team", createdTeam!.Name);

            // Cleanup
            await authClient.DeleteAsync($"/api/teams/{createdTeam.Id}");
        }

        [Fact]
        public async Task GetTeamById_AsMember_ReturnsTeam()
        {
            // Arrange
            var email = $"team-getid-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);
            var userId = await GetUserIdAsync(email);

            // Create team
            var team = new { Name = "Team GetById" };
            var postResponse = await authClient.PostAsJsonAsync("/api/teams", team);
            var created = await postResponse.Content.ReadFromJsonAsync<Team>();

            // Add user as team member (Owner)
            var member = new
            {
                Name = "Test User",
                UserId = userId,
                TeamId = created!.Id,
                Role = 2 // Owner
            };
            await authClient.PostAsJsonAsync("/api/teamMembers", member);

            // Act
            var response = await authClient.GetAsync($"/api/teams/{created.Id}");

            // Assert
            response.EnsureSuccessStatusCode();
            var fetched = await response.Content.ReadFromJsonAsync<TeamDto>();
            Assert.NotNull(fetched);
            Assert.Equal(created.Id, fetched!.Id);

            // Cleanup
            await authClient.DeleteAsync($"/api/teams/{created.Id}");
        }

        [Fact]
        public async Task DeleteTeam_WithAuth_RemovesTeam()
        {
            // Arrange
            var email = $"team-delete-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var team = new { Name = "Para Deletar" };
            var postResponse = await authClient.PostAsJsonAsync("/api/teams", team);
            var created = await postResponse.Content.ReadFromJsonAsync<Team>();

            // Act
            var deleteResponse = await authClient.DeleteAsync($"/api/teams/{created!.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
        }

        [Fact]
        public async Task PostTeam_WithoutAuth_ReturnsUnauthorized()
        {
            // Arrange
            var team = new { Name = "Unauthorized Team" };

            // Act
            var response = await _client.PostAsJsonAsync("/api/teams", team);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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

        private async Task<string> LoginAndGetTokenAsync(string email, string password)
        {
            var loginRequest = new LoginRequest
            {
                Email = email,
                Password = password,
                RememberMe = false
            };

            var resp = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
            resp.EnsureSuccessStatusCode();

            var body = await resp.Content.ReadFromJsonAsync<LoginResponse>();
            return body!.AccessToken;
        }

        private HttpClient CreateAuthenticatedClient(string accessToken)
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            return client;
        }

        private async Task<string> GetUserIdAsync(string email)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<Fluxnote.Backend.Data.FluxnoteServerContext>();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user?.Id ?? "";
        }
    }
}
