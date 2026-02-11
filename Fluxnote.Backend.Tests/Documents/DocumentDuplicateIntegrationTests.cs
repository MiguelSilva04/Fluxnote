using Fluxnote.Backend.Contracts.Auth;
using Fluxnote.Backend.Data;
using Fluxnote.Backend.Dtos.Auth;
using Fluxnote.Backend.Dtos.Documents;
using Fluxnote.Backend.Models;
using Fluxnote.Backend.Tests.Fakes;
using Fluxnote.Backend.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Web;

namespace Fluxnote.Backend.Tests.Documents
{
    /// <summary>
    /// Testes de integração para a funcionalidade de duplicação de documentos.
    /// </summary>
    public class DocumentDuplicateIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public DocumentDuplicateIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task DuplicateDocument_AsOwner_CreatesNewDocument()
        {
            // Arrange
            var ownerEmail = $"dup-owner-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            // Criar documento original
            var createRequest = new CreateDocumentRequest
            {
                Title = "Original Document",
                TeamName = "Duplicate Test Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", createRequest);
            createResponse.EnsureSuccessStatusCode();
            var originalDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar conteúdo ao documento original
            var updateRequest = new UpdateDocumentRequest
            {
                Content = "<p>Original content to be copied</p>"
            };
            var updateResponse = await ownerClient.PutAsJsonAsync($"/api/documents/{originalDoc!.Id}", updateRequest);
            updateResponse.EnsureSuccessStatusCode();

            // Act - Duplicar documento
            var duplicateResponse = await ownerClient.PostAsync($"/api/documents/{originalDoc.Id}/duplicate", null);

            // Assert
            duplicateResponse.EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.Created, duplicateResponse.StatusCode);

            var duplicatedDoc = await duplicateResponse.Content.ReadFromJsonAsync<DocumentDto>();
            Assert.NotNull(duplicatedDoc);
            Assert.NotEqual(originalDoc.Id, duplicatedDoc!.Id);
            Assert.Equal("Original Document (Copy)", duplicatedDoc.Title);
            Assert.Equal(originalDoc.TeamId, duplicatedDoc.TeamId);

            // Verificar que o conteúdo foi copiado
            var getResponse = await ownerClient.GetAsync($"/api/documents/{duplicatedDoc.Id}");
            var docDetail = await getResponse.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.Equal("<p>Original content to be copied</p>", docDetail!.Content);
        }

        [Fact]
        public async Task DuplicateDocument_AsMember_ReturnsForbidden()
        {
            // Arrange
            var ownerEmail = $"dup-owner2-{Guid.NewGuid()}@test.com";
            var memberEmail = $"dup-member-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Criar documento como Owner
            var createRequest = new CreateDocumentRequest
            {
                Title = "Owner's Document",
                TeamName = "Member Duplicate Test Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", createRequest);
            createResponse.EnsureSuccessStatusCode();
            var doc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar membro à equipa com permissão Editor
            var memberId = await GetUserIdAsync(memberEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "Member User",
                    UserId = memberId,
                    TeamId = doc!.TeamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = doc.Id,
                    Role = DocumentRole.Editor,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Act - Membro tenta duplicar
            var duplicateResponse = await memberClient.PostAsync($"/api/documents/{doc!.Id}/duplicate", null);

            // Assert - Deve retornar 403
            Assert.Equal(HttpStatusCode.Forbidden, duplicateResponse.StatusCode);
        }

        [Fact]
        public async Task DuplicateDocument_DoesNotCopyPermissions()
        {
            // Arrange
            var ownerEmail = $"dup-perm-owner-{Guid.NewGuid()}@test.com";
            var memberEmail = $"dup-perm-member-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Criar documento e adicionar membro com permissão
            var createRequest = new CreateDocumentRequest
            {
                Title = "Doc with Permissions",
                TeamName = "Permission Copy Test Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", createRequest);
            createResponse.EnsureSuccessStatusCode();
            var originalDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar membro à equipa com permissão no documento original
            var memberId = await GetUserIdAsync(memberEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "Member User",
                    UserId = memberId,
                    TeamId = originalDoc!.TeamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = originalDoc.Id,
                    Role = DocumentRole.Editor,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Membro consegue aceder ao documento original
            var memberOriginalAccess = await memberClient.GetAsync($"/api/documents/{originalDoc!.Id}");
            Assert.Equal(HttpStatusCode.OK, memberOriginalAccess.StatusCode);

            // Act - Owner duplica o documento
            var duplicateResponse = await ownerClient.PostAsync($"/api/documents/{originalDoc.Id}/duplicate", null);
            duplicateResponse.EnsureSuccessStatusCode();
            var duplicatedDoc = await duplicateResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Assert - Membro NÃO consegue aceder ao documento duplicado (permissões não foram copiadas)
            var memberDuplicateAccess = await memberClient.GetAsync($"/api/documents/{duplicatedDoc!.Id}");
            Assert.Equal(HttpStatusCode.Forbidden, memberDuplicateAccess.StatusCode);

            // Verificar que apenas existe 1 DocumentPermission (do Owner)
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
                var permissions = await db.DocumentPermission
                    .Where(dp => dp.DocumentId == duplicatedDoc.Id)
                    .ToListAsync();

                Assert.Single(permissions);
            }
        }

        #region Helper Methods

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

        #endregion
    }
}
