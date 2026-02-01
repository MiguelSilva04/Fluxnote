using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Web;
using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Fluxnote.Backend.Tests.TeamTesting
{
    public class TeamMembersControllerTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public TeamMembersControllerTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetTeamMembers_ReturnsOk()
        {
            var response = await _client.GetAsync("/api/teammembers");

            response.EnsureSuccessStatusCode();
            var members = await response.Content.ReadFromJsonAsync<List<TeamMember>>();

            Assert.NotNull(members);
        }

        [Fact]
        public async Task PostTeamMember_CreatesMember()
        {
            // Arrange - Create user and team first (teams require auth)
            var email = $"member-post-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var team = new { Name = "Team for Member Test" };
            var teamResponse = await authClient.PostAsJsonAsync("/api/teams", team);
            var createdTeam = await teamResponse.Content.ReadFromJsonAsync<Team>();

            var member = new
            {
                Name = "user teste",
                Role = 0,
                TeamId = createdTeam!.Id
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/teammembers", member);

            // Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var created = await response.Content.ReadFromJsonAsync<TeamMember>();
            Assert.NotNull(created);
            Assert.Equal("user teste", created!.Name);
            Assert.Equal(TeamRole.Member, created.Role);
            Assert.Equal(createdTeam.Id, created.TeamId);

            // Cleanup
            await _client.DeleteAsync($"/api/teammembers/{created.Id}");
            await authClient.DeleteAsync($"/api/teams/{createdTeam.Id}");
        }

        [Fact]
        public async Task GetTeamMemberById_ReturnsMember()
        {
            // Arrange - Create user and team first
            var email = $"member-getbyid-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var team = new { Name = "Team for GetById Test" };
            var teamResponse = await authClient.PostAsJsonAsync("/api/teams", team);
            var createdTeam = await teamResponse.Content.ReadFromJsonAsync<Team>();

            var member = new
            {
                Name = "GetById User",
                Role = (int)TeamRole.TeamAdmin,
                TeamId = createdTeam!.Id
            };

            var postResponse = await _client.PostAsJsonAsync("/api/teammembers", member);
            var created = await postResponse.Content.ReadFromJsonAsync<TeamMember>();

            // Act
            var response = await _client.GetAsync($"/api/teammembers/{created!.Id}");

            // Assert
            response.EnsureSuccessStatusCode();
            var fetched = await response.Content.ReadFromJsonAsync<TeamMember>();

            Assert.NotNull(fetched);
            Assert.Equal(created.Id, fetched!.Id);
            Assert.Equal("GetById User", fetched.Name);

            // Cleanup
            await _client.DeleteAsync($"/api/teammembers/{created.Id}");
            await authClient.DeleteAsync($"/api/teams/{createdTeam.Id}");
        }

        [Fact]
        public async Task PutTeamMember_UpdatesMember()
        {
            // Arrange - Create user and team first
            var email = $"member-put-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var team = new { Name = "Team for Put Test" };
            var teamResponse = await authClient.PostAsJsonAsync("/api/teams", team);
            var createdTeam = await teamResponse.Content.ReadFromJsonAsync<Team>();

            var member = new
            {
                Name = "Old Name",
                Role = (int)TeamRole.Member,
                TeamId = createdTeam!.Id
            };

            var postResponse = await _client.PostAsJsonAsync("/api/teammembers", member);
            var created = await postResponse.Content.ReadFromJsonAsync<TeamMember>();

            created!.Name = "Updated Name";
            created.Role = TeamRole.Owner;

            // Act
            var putResponse = await _client.PutAsJsonAsync($"/api/teammembers/{created.Id}", created);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, putResponse.StatusCode);

            var getResponse = await _client.GetAsync($"/api/teammembers/{created.Id}");
            var updated = await getResponse.Content.ReadFromJsonAsync<TeamMember>();

            Assert.Equal("Updated Name", updated!.Name);
            Assert.Equal(TeamRole.Owner, updated.Role);

            // Cleanup
            await _client.DeleteAsync($"/api/teammembers/{created.Id}");
            await authClient.DeleteAsync($"/api/teams/{createdTeam.Id}");
        }

        [Fact]
        public async Task DeleteTeamMember_RemovesMember()
        {
            // Arrange - Create user and team first
            var email = $"member-delete-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var team = new { Name = "Team for Delete Test" };
            var teamResponse = await authClient.PostAsJsonAsync("/api/teams", team);
            var createdTeam = await teamResponse.Content.ReadFromJsonAsync<Team>();

            var member = new
            {
                Name = "To Delete",
                Role = (int)TeamRole.Member,
                TeamId = createdTeam!.Id
            };

            var postResponse = await _client.PostAsJsonAsync("/api/teammembers", member);
            var created = await postResponse.Content.ReadFromJsonAsync<TeamMember>();

            // Act
            var deleteResponse = await _client.DeleteAsync($"/api/teammembers/{created!.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

            var getResponse = await _client.GetAsync($"/api/teammembers/{created.Id}");
            Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);

            // Cleanup
            await authClient.DeleteAsync($"/api/teams/{createdTeam!.Id}");
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
    }
}
