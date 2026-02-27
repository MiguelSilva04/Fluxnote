using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Web;
using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Dtos.Documents;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Fluxnote.Backend.Tests.Requirements
{
    public class TeamRolesIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public TeamRolesIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Owner_Can_Promote_Member_To_TeamAdmin()
        {
            var ownerEmail = $"roles-owner-{Guid.NewGuid()}@test.com";
            var memberEmail = $"roles-member-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            var document = await CreateDocumentAsOwnerAsync(ownerClient, "Roles Doc", "Roles Team");

            var memberUserId = await GetUserIdAsync(memberEmail);
            var member = await AddTeamMemberAsync(document.TeamId, memberUserId, TeamRole.Member, "Member User");

            var updateRequest = new { role = (int)TeamRole.TeamAdmin };
            var response = await ownerClient.PutAsJsonAsync($"/api/teammembers/{member.Id}", updateRequest);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
            var updated = await db.TeamMember.FindAsync(member.Id);
            Assert.NotNull(updated);
            Assert.Equal(TeamRole.TeamAdmin, updated!.Role);
        }

        [Fact]
        public async Task TeamAdmin_Cannot_Change_Member_Role()
        {
            var ownerEmail = $"roles-owner-admin-{Guid.NewGuid()}@test.com";
            var adminEmail = $"roles-admin-{Guid.NewGuid()}@test.com";
            var memberEmail = $"roles-member-change-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var adminClient = CreateAuthenticatedClient(adminToken);

            var document = await CreateDocumentAsOwnerAsync(ownerClient, "Roles Doc 2", "Roles Team 2");

            var adminUserId = await GetUserIdAsync(adminEmail);
            var memberUserId = await GetUserIdAsync(memberEmail);
            await AddTeamMemberAsync(document.TeamId, adminUserId, TeamRole.TeamAdmin, "Team Admin");
            var member = await AddTeamMemberAsync(document.TeamId, memberUserId, TeamRole.Member, "Member User");

            var updateRequest = new { role = (int)TeamRole.TeamAdmin };
            var response = await adminClient.PutAsJsonAsync($"/api/teammembers/{member.Id}", updateRequest);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Owner_Can_Add_DocumentPermission_For_Member()
        {
            var ownerEmail = $"roles-owner-perm-{Guid.NewGuid()}@test.com";
            var memberEmail = $"roles-member-perm-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            var document = await CreateDocumentAsOwnerAsync(ownerClient, "Roles Doc 3", "Roles Team 3");

            var memberUserId = await GetUserIdAsync(memberEmail);
            var member = await AddTeamMemberAsync(document.TeamId, memberUserId, TeamRole.Member, "Member User");

            var request = new CreateDocumentPermissionRequest
            {
                DocumentId = document.Id,
                TeamMemberId = member.Id,
                Role = (int)DocumentRole.Editor
            };

            var response = await ownerClient.PostAsJsonAsync("/api/documentpermissions", request);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var created = await response.Content.ReadFromJsonAsync<DocumentPermissionDto>();
            Assert.NotNull(created);
            Assert.Equal((int)DocumentRole.Editor, created!.DocumentRole);

            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
            var permission = await db.DocumentPermission.FirstOrDefaultAsync(dp =>
                dp.DocumentId == document.Id && dp.TeamMemberId == member.Id);
            Assert.NotNull(permission);
            Assert.Equal(DocumentRole.Editor, permission!.Role);
        }

        [Fact]
        public async Task TeamAdmin_Can_Add_DocumentPermission_For_Member()
        {
            var ownerEmail = $"roles-owner-adminperm-{Guid.NewGuid()}@test.com";
            var adminEmail = $"roles-admin-adminperm-{Guid.NewGuid()}@test.com";
            var memberEmail = $"roles-member-adminperm-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var adminClient = CreateAuthenticatedClient(adminToken);

            var document = await CreateDocumentAsOwnerAsync(ownerClient, "Roles Doc 4", "Roles Team 4");

            var adminUserId = await GetUserIdAsync(adminEmail);
            var memberUserId = await GetUserIdAsync(memberEmail);
            await AddTeamMemberAsync(document.TeamId, adminUserId, TeamRole.TeamAdmin, "Team Admin");
            var member = await AddTeamMemberAsync(document.TeamId, memberUserId, TeamRole.Member, "Member User");

            var request = new CreateDocumentPermissionRequest
            {
                DocumentId = document.Id,
                TeamMemberId = member.Id,
                Role = (int)DocumentRole.Viewer
            };

            var response = await adminClient.PostAsJsonAsync("/api/documentpermissions", request);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        [Fact]
        public async Task TeamAdmin_Cannot_Modify_Another_Admin_Permission()
        {
            var ownerEmail = $"roles-owner-adminmod-{Guid.NewGuid()}@test.com";
            var adminEmail = $"roles-admin-adminmod-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var adminClient = CreateAuthenticatedClient(adminToken);

            var document = await CreateDocumentAsOwnerAsync(ownerClient, "Roles Doc 5", "Roles Team 5");

            var adminUserId = await GetUserIdAsync(adminEmail);
            var adminMember = await AddTeamMemberAsync(document.TeamId, adminUserId, TeamRole.TeamAdmin, "Team Admin");

            var createPermission = new CreateDocumentPermissionRequest
            {
                DocumentId = document.Id,
                TeamMemberId = adminMember.Id,
                Role = (int)DocumentRole.Viewer
            };

            var createdResponse = await ownerClient.PostAsJsonAsync("/api/documentpermissions", createPermission);
            createdResponse.EnsureSuccessStatusCode();
            var created = await createdResponse.Content.ReadFromJsonAsync<DocumentPermissionDto>();

            var updateRequest = new UpdateDocumentPermissionRequest { Role = (int)DocumentRole.Editor };
            var response = await adminClient.PutAsJsonAsync($"/api/documentpermissions/{created!.Id}", updateRequest);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task TeamAdmin_Cannot_Remove_Owner_From_Team()
        {
            var ownerEmail = $"roles-owner-remove-{Guid.NewGuid()}@test.com";
            var adminEmail = $"roles-admin-remove-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var adminClient = CreateAuthenticatedClient(adminToken);

            var document = await CreateDocumentAsOwnerAsync(ownerClient, "Roles Doc 6", "Roles Team 6");

            var adminUserId = await GetUserIdAsync(adminEmail);
            await AddTeamMemberAsync(document.TeamId, adminUserId, TeamRole.TeamAdmin, "Team Admin");

            var ownerMemberId = await GetTeamMemberIdAsync(document.TeamId, await GetUserIdAsync(ownerEmail));

            var response = await adminClient.DeleteAsync($"/api/teammembers/{ownerMemberId}");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Member_Cannot_Update_DocumentPermission()
        {
            var ownerEmail = $"roles-owner-memberperm-{Guid.NewGuid()}@test.com";
            var memberEmail = $"roles-member-memberperm-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            var document = await CreateDocumentAsOwnerAsync(ownerClient, "Roles Doc 7", "Roles Team 7");

            var memberUserId = await GetUserIdAsync(memberEmail);
            var member = await AddTeamMemberAsync(document.TeamId, memberUserId, TeamRole.Member, "Member User");

            var createPermission = new CreateDocumentPermissionRequest
            {
                DocumentId = document.Id,
                TeamMemberId = member.Id,
                Role = (int)DocumentRole.Viewer
            };

            var createdResponse = await ownerClient.PostAsJsonAsync("/api/documentpermissions", createPermission);
            createdResponse.EnsureSuccessStatusCode();
            var created = await createdResponse.Content.ReadFromJsonAsync<DocumentPermissionDto>();

            var updateRequest = new UpdateDocumentPermissionRequest { Role = (int)DocumentRole.Editor };
            var response = await memberClient.PutAsJsonAsync($"/api/documentpermissions/{created!.Id}", updateRequest);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        private async Task<DocumentDto> CreateDocumentAsOwnerAsync(HttpClient ownerClient, string title, string teamName)
        {
            var request = new CreateDocumentRequest
            {
                Title = title,
                TeamName = teamName
            };

            var response = await ownerClient.PostAsJsonAsync("/api/documents", request);
            response.EnsureSuccessStatusCode();
            return (await response.Content.ReadFromJsonAsync<DocumentDto>())!;
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

        private async Task<int> GetTeamMemberIdAsync(int teamId, string userId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
            var member = await db.TeamMember.FirstOrDefaultAsync(m => m.TeamId == teamId && m.UserId == userId);
            return member?.Id ?? 0;
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
