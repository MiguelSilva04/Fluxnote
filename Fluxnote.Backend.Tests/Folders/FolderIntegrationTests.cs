using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Dtos.Documents;
using Fluxnote.Backend.Dtos.Folders;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Web;

namespace Fluxnote.Backend.Tests.Folders
{
    public class FolderIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public FolderIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        // ==================== AUTH / ACCESS ====================

        [Fact]
        public async Task GetFolders_WithoutAuth_ReturnsUnauthorized()
        {
            var response = await _client.GetAsync("/api/folders?teamId=1");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task CreateFolder_WithoutAuth_ReturnsUnauthorized()
        {
            var response = await _client.PostAsJsonAsync("/api/folders", new { Name = "Test", TeamId = 1 });
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        // ==================== CRUD ====================

        [Fact]
        public async Task CreateFolder_AsOwner_ReturnsCreated()
        {
            // Arrange
            var (authClient, teamId) = await SetupTeamWithOwnerAsync();

            // Act
            var response = await authClient.PostAsJsonAsync("/api/folders", new { Name = "Marketing", TeamId = teamId });

            // Assert
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var folder = await response.Content.ReadFromJsonAsync<FolderDto>();
            Assert.NotNull(folder);
            Assert.Equal("Marketing", folder!.Name);
            Assert.Equal(teamId, folder.TeamId);
            Assert.Equal(0, folder.DocumentCount);
        }

        [Fact]
        public async Task CreateFolder_AsMember_ReturnsForbidden()
        {
            // Arrange
            var (_, teamId, memberClient) = await SetupTeamWithMemberAsync();

            // Act
            var response = await memberClient.PostAsJsonAsync("/api/folders", new { Name = "Blocked", TeamId = teamId });

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task GetFolders_AsMember_ReturnsOk()
        {
            // Arrange
            var (ownerClient, teamId, memberClient) = await SetupTeamWithMemberAsync();

            // Create a folder as owner
            await ownerClient.PostAsJsonAsync("/api/folders", new { Name = "Visible Folder", TeamId = teamId });

            // Act
            var response = await memberClient.GetAsync($"/api/folders?teamId={teamId}");

            // Assert
            response.EnsureSuccessStatusCode();
            var folders = await response.Content.ReadFromJsonAsync<List<FolderDto>>();
            Assert.NotNull(folders);
            Assert.Contains(folders!, f => f.Name == "Visible Folder");
        }

        [Fact]
        public async Task UpdateFolder_AsOwner_ReturnsNoContent()
        {
            // Arrange
            var (authClient, teamId) = await SetupTeamWithOwnerAsync();
            var createResp = await authClient.PostAsJsonAsync("/api/folders", new { Name = "Old Name", TeamId = teamId });
            var folder = await createResp.Content.ReadFromJsonAsync<FolderDto>();

            // Act
            var response = await authClient.PutAsJsonAsync($"/api/folders/{folder!.Id}", new { Name = "New Name" });

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            // Verify
            var getResp = await authClient.GetAsync($"/api/folders?teamId={teamId}");
            var folders = await getResp.Content.ReadFromJsonAsync<List<FolderDto>>();
            Assert.Contains(folders!, f => f.Name == "New Name");
        }

        [Fact]
        public async Task DeleteFolder_AsOwner_ReturnsNoContent()
        {
            // Arrange
            var (authClient, teamId) = await SetupTeamWithOwnerAsync();
            var createResp = await authClient.PostAsJsonAsync("/api/folders", new { Name = "To Delete", TeamId = teamId });
            var folder = await createResp.Content.ReadFromJsonAsync<FolderDto>();

            // Act
            var response = await authClient.DeleteAsync($"/api/folders/{folder!.Id}");

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            // Verify folder is gone
            var getResp = await authClient.GetAsync($"/api/folders?teamId={teamId}");
            var folders = await getResp.Content.ReadFromJsonAsync<List<FolderDto>>();
            Assert.DoesNotContain(folders!, f => f.Id == folder.Id);
        }

        // ==================== MOVE DOCUMENT ====================

        [Fact]
        public async Task MoveDocumentToFolder_AsOwner_ReturnsNoContent()
        {
            // Arrange
            var (authClient, teamId) = await SetupTeamWithOwnerAsync();

            // Create folder
            var folderResp = await authClient.PostAsJsonAsync("/api/folders", new { Name = "Docs Folder", TeamId = teamId });
            var folder = await folderResp.Content.ReadFromJsonAsync<FolderDto>();

            // Create document
            var docResp = await authClient.PostAsJsonAsync("/api/documents", new { Title = "Test Doc", TeamId = teamId });
            docResp.EnsureSuccessStatusCode();
            var doc = await docResp.Content.ReadFromJsonAsync<DocumentDto>();
            int docId = doc!.Id;

            // Act
            var response = await authClient.PutAsJsonAsync($"/api/folders/{folder!.Id}/documents/{docId}", new { });

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        [Fact]
        public async Task RemoveDocumentFromFolder_AsOwner_ReturnsNoContent()
        {
            // Arrange
            var (authClient, teamId) = await SetupTeamWithOwnerAsync();

            // Create folder and doc
            var folderResp = await authClient.PostAsJsonAsync("/api/folders", new { Name = "Folder R", TeamId = teamId });
            var folder = await folderResp.Content.ReadFromJsonAsync<FolderDto>();

            var docResp = await authClient.PostAsJsonAsync("/api/documents", new { Title = "Doc R", TeamId = teamId });
            docResp.EnsureSuccessStatusCode();
            var doc = await docResp.Content.ReadFromJsonAsync<DocumentDto>();
            int docId = doc!.Id;

            // Move doc into folder first
            await authClient.PutAsJsonAsync($"/api/folders/{folder!.Id}/documents/{docId}", new { });

            // Act
            var response = await authClient.DeleteAsync($"/api/folders/{folder.Id}/documents/{docId}");

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }

        [Fact]
        public async Task DeleteFolder_DocumentsBecomeUnfoldered()
        {
            // Arrange
            var (authClient, teamId) = await SetupTeamWithOwnerAsync();

            var folderResp = await authClient.PostAsJsonAsync("/api/folders", new { Name = "Will Delete", TeamId = teamId });
            var folder = await folderResp.Content.ReadFromJsonAsync<FolderDto>();

            var docResp = await authClient.PostAsJsonAsync("/api/documents", new { Title = "Orphan Doc", TeamId = teamId });
            docResp.EnsureSuccessStatusCode();
            var doc = await docResp.Content.ReadFromJsonAsync<DocumentDto>();
            int docId = doc!.Id;

            // Move doc into folder
            await authClient.PutAsJsonAsync($"/api/folders/{folder!.Id}/documents/{docId}", new { });

            // Act - delete the folder
            var deleteResp = await authClient.DeleteAsync($"/api/folders/{folder.Id}");
            Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

            // Assert - document still exists with no folder
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<Fluxnote.Backend.Data.FluxnoteServerContext>();
            var document = await db.Document.FindAsync(docId);
            Assert.NotNull(document);
            Assert.Null(document!.FolderId);
        }

        [Fact]
        public async Task GetFolders_NonMember_ReturnsForbidden()
        {
            // Arrange
            var (ownerClient, teamId) = await SetupTeamWithOwnerAsync();
            await ownerClient.PostAsJsonAsync("/api/folders", new { Name = "Secret Folder", TeamId = teamId });

            // Create another user who is not a member of this team
            var otherEmail = $"folder-nonmember-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(otherEmail, "Teste1234!");
            var otherToken = await LoginAndGetTokenAsync(otherEmail, "Teste1234!");
            var otherClient = CreateAuthenticatedClient(otherToken);

            // Act
            var response = await otherClient.GetAsync($"/api/folders?teamId={teamId}");

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        // ==================== HELPER METHODS ====================

        private async Task<(HttpClient authClient, int teamId)> SetupTeamWithOwnerAsync()
        {
            var email = $"folder-owner-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);
            var userId = await GetUserIdAsync(email);

            // Create team
            var teamResp = await authClient.PostAsJsonAsync("/api/teams", new { Name = $"Team-{Guid.NewGuid():N}" });
            var team = await teamResp.Content.ReadFromJsonAsync<Team>();

            // Add as Owner
            await authClient.PostAsJsonAsync("/api/teamMembers", new
            {
                Name = "Owner User",
                UserId = userId,
                TeamId = team!.Id,
                Role = 2
            });

            // Set ownerId on team
            await authClient.PutAsJsonAsync($"/api/teams/{team.Id}", new { Name = team.Name, OwnerId = 1 });

            return (authClient, team.Id);
        }

        private async Task<(HttpClient ownerClient, int teamId, HttpClient memberClient)> SetupTeamWithMemberAsync()
        {
            var (ownerClient, teamId) = await SetupTeamWithOwnerAsync();

            // Create member user
            var memberEmail = $"folder-member-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");
            var memberClient = CreateAuthenticatedClient(memberToken);
            var memberUserId = await GetUserIdAsync(memberEmail);

            // Add as Member (role 0)
            await ownerClient.PostAsJsonAsync("/api/teamMembers", new
            {
                Name = "Member User",
                UserId = memberUserId,
                TeamId = teamId,
                Role = 0
            });

            return (ownerClient, teamId, memberClient);
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
            var db = scope.ServiceProvider.GetRequiredService<Fluxnote.Backend.Data.FluxnoteServerContext>();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user?.Id ?? "";
        }
    }
}
