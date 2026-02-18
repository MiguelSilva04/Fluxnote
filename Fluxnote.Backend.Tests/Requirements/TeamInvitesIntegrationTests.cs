using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Web;
using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Dtos.TeamInvites;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Fluxnote.Backend.Tests.Requirements
{
    public class TeamInvitesIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public TeamInvitesIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task CreateInvite_AsOwner_Succeeds()
        {
            var ownerEmail = $"invite-owner-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            var team = await CreateTeamAsync(ownerClient, "Invite Team");

            var request = new CreateTeamInviteRequest
            {
                TeamId = team.Id,
                ExpirationDays = 7
            };

            var response = await ownerClient.PostAsJsonAsync("/api/team-invites", request);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var invite = await response.Content.ReadFromJsonAsync<TeamInviteDto>();
            Assert.NotNull(invite);
            Assert.Equal(team.Id, invite!.TeamId);
        }

        [Fact]
        public async Task CreateInvite_AsTeamMember_Succeeds()
        {
            var ownerEmail = $"invite-owner-member-{Guid.NewGuid()}@test.com";
            var adminEmail = $"invite-teamAdmin-member-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var adminClient = CreateAuthenticatedClient(adminToken);

            var team = await CreateTeamAsync(ownerClient, "Invite Team (TeamAdminTest)");

            var adminUserId = await GetUserIdAsync(adminEmail);
            await AddTeamMemberAsync(team.Id, adminUserId, TeamRole.TeamAdmin, "Team Admin User");

            var request = new CreateTeamInviteRequest
            {
                TeamId = team.Id,
                ExpirationDays = 7
            };

            var response = await adminClient.PostAsJsonAsync("/api/team-invites", request);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var invite = await response.Content.ReadFromJsonAsync<TeamInviteDto>();
            Assert.NotNull(invite);
            Assert.Equal(team.Id, invite!.TeamId);
        }

        [Fact]
        public async Task CreateInvite_AsMember_ReturnsForbidden()
        {
            var ownerEmail = $"invite-owner-member-{Guid.NewGuid()}@test.com";
            var memberEmail = $"invite-member-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            var team = await CreateTeamAsync(ownerClient, "Invite Team 2");

            var memberUserId = await GetUserIdAsync(memberEmail);
            await AddTeamMemberAsync(team.Id, memberUserId, TeamRole.Member, "Member User");

            var request = new CreateTeamInviteRequest
            {
                TeamId = team.Id,
                ExpirationDays = 7
            };

            var response = await memberClient.PostAsJsonAsync("/api/team-invites", request);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }


        [Fact]
        public async Task AcceptInvite_CreatesMember()
        {
            var ownerEmail = $"invite-owner-accept-{Guid.NewGuid()}@test.com";
            var inviteeEmail = $"invitee-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(inviteeEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var inviteeToken = await LoginAndGetTokenAsync(inviteeEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var inviteeClient = CreateAuthenticatedClient(inviteeToken);

            var team = await CreateTeamAsync(ownerClient, "Invite Team 3");

            var inviteRequest = new CreateTeamInviteRequest
            {
                TeamId = team.Id,
                ExpirationDays = 7
            };

            var inviteResponse = await ownerClient.PostAsJsonAsync("/api/team-invites", inviteRequest);
            inviteResponse.EnsureSuccessStatusCode();
            var invite = await inviteResponse.Content.ReadFromJsonAsync<TeamInviteDto>();

            var acceptResponse = await inviteeClient.PostAsJsonAsync($"/api/team-invites/{invite!.Token}/accept", new { });
            acceptResponse.EnsureSuccessStatusCode();
            var acceptResult = await acceptResponse.Content.ReadFromJsonAsync<AcceptTeamInviteResponseDto>();

            Assert.NotNull(acceptResult);
            Assert.Equal(team.Id, acceptResult!.TeamId);

            var inviteeUserId = await GetUserIdAsync(inviteeEmail);
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

            var teamMember = await db.TeamMember
                .FirstOrDefaultAsync(m => m.TeamId == team.Id && m.UserId == inviteeUserId);

            Assert.NotNull(teamMember);
            Assert.Equal(TeamRole.Member, teamMember!.Role);
        }

        [Fact]
        public async Task Invitee_Can_Access_Team_After_Accepting()
        {
            var ownerEmail = $"invite-owner-access-{Guid.NewGuid()}@test.com";
            var inviteeEmail = $"invitee-access-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(inviteeEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var inviteeToken = await LoginAndGetTokenAsync(inviteeEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var inviteeClient = CreateAuthenticatedClient(inviteeToken);

            var team = await CreateTeamAsync(ownerClient, "Invite Team 4");

            var inviteRequest = new CreateTeamInviteRequest
            {
                TeamId= team.Id,
                ExpirationDays = 7
            };

            var inviteResponse = await ownerClient.PostAsJsonAsync("/api/team-invites", inviteRequest);
            inviteResponse.EnsureSuccessStatusCode();
            var invite = await inviteResponse.Content.ReadFromJsonAsync<TeamInviteDto>();

            var acceptResponse = await inviteeClient.PostAsJsonAsync($"/api/team-invites/{invite!.Token}/accept", new { });
            acceptResponse.EnsureSuccessStatusCode();

            var teamResponse = await inviteeClient.GetAsync($"/api/teams/{team.Id}");
            teamResponse.EnsureSuccessStatusCode();
        }

        private async Task<Team> CreateTeamAsync(HttpClient ownerClient, string teamName)
        {
            var request = new Team
            {
                Name = teamName
            };

            var response = await ownerClient.PostAsJsonAsync("/api/teams", request);
            response.EnsureSuccessStatusCode();
            return (await response.Content.ReadFromJsonAsync<Team>())!;
        }

        private async Task<TeamMember> AddTeamMemberAsync(int teamId, string userId, TeamRole role, string name)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

            var member = new TeamMember
            {
                Name = name,
                UserId = userId,
                TeamId = teamId,
                Role = role,
                JoinedAt = DateTime.UtcNow
            };

            db.TeamMember.Add(member);
            await db.SaveChangesAsync();
            return member;
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
