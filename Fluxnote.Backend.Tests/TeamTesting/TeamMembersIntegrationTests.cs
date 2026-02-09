using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Web;
using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
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
        public async Task PostTeamMember_CreatesOwnerAsFirstMember()
        {
            var email = $"member-post-owner-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var team = new { Name = "Team for Owner Member Test" };
            var teamResponse = await authClient.PostAsJsonAsync("/api/teams", team);
            teamResponse.EnsureSuccessStatusCode();
            var createdTeam = await teamResponse.Content.ReadFromJsonAsync<Team>();

            var userId = await GetUserIdAsync(email);
            var memberRequest = new
            {
                Name = "Owner User",
                Role = (int)TeamRole.Owner,
                TeamId = createdTeam!.Id,
                UserId = userId
            };

            var response = await authClient.PostAsJsonAsync("/api/teammembers", memberRequest);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var created = await response.Content.ReadFromJsonAsync<TeamMember>();
            Assert.NotNull(created);
            Assert.Equal("Owner User", created!.Name);
            Assert.Equal(TeamRole.Owner, created.Role);
            Assert.Equal(createdTeam.Id, created.TeamId);
            Assert.Equal(userId, created.UserId);

            await authClient.DeleteAsync($"/api/teammembers/{created.Id}");
            await authClient.DeleteAsync($"/api/teams/{createdTeam.Id}");
        }

        [Fact]
        public async Task PostTeamMember_AsOwner_CreatesMember()
        {
            var ownerEmail = $"member-post-owner2-{Guid.NewGuid()}@test.com";
            var memberEmail = $"member-post-member-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            var team = new { Name = "Team for Member Create Test" };
            var teamResponse = await ownerClient.PostAsJsonAsync("/api/teams", team);
            teamResponse.EnsureSuccessStatusCode();
            var createdTeam = await teamResponse.Content.ReadFromJsonAsync<Team>();

            var ownerUserId = await GetUserIdAsync(ownerEmail);
            var ownerMemberRequest = new
            {
                Name = "Owner User",
                Role = (int)TeamRole.Owner,
                TeamId = createdTeam!.Id,
                UserId = ownerUserId
            };
            var ownerMemberResponse = await ownerClient.PostAsJsonAsync("/api/teammembers", ownerMemberRequest);
            ownerMemberResponse.EnsureSuccessStatusCode();

            var memberUserId = await GetUserIdAsync(memberEmail);
            var memberRequest = new
            {
                Name = "Regular Member",
                Role = (int)TeamRole.Member,
                TeamId = createdTeam.Id,
                UserId = memberUserId
            };

            var response = await ownerClient.PostAsJsonAsync("/api/teammembers", memberRequest);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var created = await response.Content.ReadFromJsonAsync<TeamMember>();
            Assert.NotNull(created);
            Assert.Equal("Regular Member", created!.Name);
            Assert.Equal(TeamRole.Member, created.Role);
            Assert.Equal(createdTeam.Id, created.TeamId);
            Assert.Equal(memberUserId, created.UserId);

            await ownerClient.DeleteAsync($"/api/teammembers/{created.Id}");
            await ownerClient.DeleteAsync($"/api/teams/{createdTeam.Id}");
        }

        [Fact]
        public async Task PutTeamMember_UpdatesMemberRole()
        {
            var ownerEmail = $"member-put-owner-{Guid.NewGuid()}@test.com";
            var memberEmail = $"member-put-member-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            var team = new { Name = "Team for Put Test" };
            var teamResponse = await ownerClient.PostAsJsonAsync("/api/teams", team);
            teamResponse.EnsureSuccessStatusCode();
            var createdTeam = await teamResponse.Content.ReadFromJsonAsync<Team>();

            var ownerUserId = await GetUserIdAsync(ownerEmail);
            var ownerMemberRequest = new
            {
                Name = "Owner User",
                Role = (int)TeamRole.Owner,
                TeamId = createdTeam!.Id,
                UserId = ownerUserId
            };
            var ownerMemberResponse = await ownerClient.PostAsJsonAsync("/api/teammembers", ownerMemberRequest);
            ownerMemberResponse.EnsureSuccessStatusCode();

            var memberUserId = await GetUserIdAsync(memberEmail);
            var memberRequest = new
            {
                Name = "Member User",
                Role = (int)TeamRole.Member,
                TeamId = createdTeam.Id,
                UserId = memberUserId
            };
            var postResponse = await ownerClient.PostAsJsonAsync("/api/teammembers", memberRequest);
            postResponse.EnsureSuccessStatusCode();
            var created = await postResponse.Content.ReadFromJsonAsync<TeamMember>();

            var updateRequest = new { role = (int)TeamRole.TeamAdmin };
            var putResponse = await ownerClient.PutAsJsonAsync($"/api/teammembers/{created!.Id}", updateRequest);

            Assert.Equal(HttpStatusCode.NoContent, putResponse.StatusCode);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
            var updated = await db.TeamMember.FindAsync(created.Id);
            Assert.NotNull(updated);
            Assert.Equal(TeamRole.TeamAdmin, updated!.Role);

            await ownerClient.DeleteAsync($"/api/teammembers/{created.Id}");
            await ownerClient.DeleteAsync($"/api/teams/{createdTeam.Id}");
        }

        [Fact]
        public async Task DeleteTeamMember_RemovesMember()
        {
            var ownerEmail = $"member-delete-owner-{Guid.NewGuid()}@test.com";
            var memberEmail = $"member-delete-member-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            var team = new { Name = "Team for Delete Test" };
            var teamResponse = await ownerClient.PostAsJsonAsync("/api/teams", team);
            teamResponse.EnsureSuccessStatusCode();
            var createdTeam = await teamResponse.Content.ReadFromJsonAsync<Team>();

            var ownerUserId = await GetUserIdAsync(ownerEmail);
            var ownerMemberRequest = new
            {
                Name = "Owner User",
                Role = (int)TeamRole.Owner,
                TeamId = createdTeam!.Id,
                UserId = ownerUserId
            };
            var ownerMemberResponse = await ownerClient.PostAsJsonAsync("/api/teammembers", ownerMemberRequest);
            ownerMemberResponse.EnsureSuccessStatusCode();

            var memberUserId = await GetUserIdAsync(memberEmail);
            var memberRequest = new
            {
                Name = "To Delete",
                Role = (int)TeamRole.Member,
                TeamId = createdTeam.Id,
                UserId = memberUserId
            };
            var postResponse = await ownerClient.PostAsJsonAsync("/api/teammembers", memberRequest);
            postResponse.EnsureSuccessStatusCode();
            var created = await postResponse.Content.ReadFromJsonAsync<TeamMember>();

            var deleteResponse = await ownerClient.DeleteAsync($"/api/teammembers/{created!.Id}");

            Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
            var deleted = await db.TeamMember.FindAsync(created.Id);
            Assert.Null(deleted);

            await ownerClient.DeleteAsync($"/api/teams/{createdTeam!.Id}");
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
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user?.Id ?? "";
        }
    }
}
