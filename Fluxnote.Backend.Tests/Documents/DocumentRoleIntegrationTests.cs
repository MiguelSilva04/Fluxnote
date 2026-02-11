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
using System.Web;

namespace Fluxnote.Backend.Tests.Documents
{
    /// <summary>
    /// Testes de integração para a role efetiva (Editor/Viewer) retornada no DocumentDetailDto.
    /// Verifica que:
    /// - Owner e TeamAdmin recebem sempre role "Editor" (bypass à DocumentRole)
    /// - Members recebem a role da sua DocumentPermission
    /// - O bypass é baseado na TeamRole (não na DocumentRole)
    /// - Viewers não podem editar, Editors podem
    /// </summary>
    public class DocumentRoleIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public DocumentRoleIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        #region GetDocument - Role Field in Response

        [Fact]
        public async Task GetDocument_AsOwner_ReturnsRoleEditor()
        {
            // Arrange - Owner cria documento
            var ownerEmail = $"role-owner-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Owner Role Test",
                TeamName = "Owner Role Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Act
            var response = await ownerClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Owner deve receber role "Editor"
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Editor", doc!.Role);
        }

        [Fact]
        public async Task GetDocument_AsTeamAdmin_ReturnsRoleEditor()
        {
            // Arrange - Owner cria documento, depois adiciona TeamAdmin
            var ownerEmail = $"role-owner-admin-{Guid.NewGuid()}@test.com";
            var adminEmail = $"role-admin-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var adminClient = CreateAuthenticatedClient(adminToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Admin Role Test",
                TeamName = "Admin Role Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar utilizador como TeamAdmin (sem DocumentPermission explícita)
            var adminUserId = await GetUserIdAsync(adminEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
                var teamMember = new TeamMember
                {
                    Name = "Admin User",
                    UserId = adminUserId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.TeamAdmin,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();
            }

            // Act
            var response = await adminClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - TeamAdmin deve receber role "Editor" (bypass)
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Editor", doc!.Role);
        }

        [Fact]
        public async Task GetDocument_AsTeamAdmin_WithViewerDocPermission_ReturnsRoleEditor()
        {
            // Arrange - Owner cria documento, TeamAdmin tem DocumentPermission Viewer
            // O bypass da TeamRole deve prevalecer
            var ownerEmail = $"role-owner-admin-viewer-{Guid.NewGuid()}@test.com";
            var adminEmail = $"role-admin-viewer-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var adminClient = CreateAuthenticatedClient(adminToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Admin Viewer Bypass Test",
                TeamName = "Admin Viewer Bypass Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar como TeamAdmin COM DocumentPermission = Viewer
            var adminUserId = await GetUserIdAsync(adminEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "Admin User",
                    UserId = adminUserId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.TeamAdmin,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Viewer, // Viewer explícito
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Act
            var response = await adminClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - TeamAdmin deve receber "Editor" mesmo com DocumentPermission=Viewer
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Editor", doc!.Role);
        }

        [Fact]
        public async Task GetDocument_AsMember_WithViewerPermission_ReturnsRoleViewer()
        {
            // Arrange
            var ownerEmail = $"role-owner-memviewer-{Guid.NewGuid()}@test.com";
            var memberEmail = $"role-member-viewer-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Member Viewer Role Test",
                TeamName = "Member Viewer Role Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member com DocumentPermission = Viewer
            var memberId = await GetUserIdAsync(memberEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "Member User",
                    UserId = memberId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Viewer,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Act
            var response = await memberClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Member com Viewer deve receber role "Viewer"
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Viewer", doc!.Role);
        }

        [Fact]
        public async Task GetDocument_AsMember_WithEditorPermission_ReturnsRoleEditor()
        {
            // Arrange
            var ownerEmail = $"role-owner-memeditor-{Guid.NewGuid()}@test.com";
            var memberEmail = $"role-member-editor-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Member Editor Role Test",
                TeamName = "Member Editor Role Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member com DocumentPermission = Editor
            var memberId = await GetUserIdAsync(memberEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "Member User",
                    UserId = memberId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Editor,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Act
            var response = await memberClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Member com Editor deve receber role "Editor"
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Editor", doc!.Role);
        }

        #endregion

        #region UpdateDocument - Role Field in Response

        [Fact]
        public async Task UpdateDocument_AsOwner_ReturnsRoleEditor()
        {
            // Arrange
            var ownerEmail = $"role-update-owner-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Update Owner Role Test",
                TeamName = "Update Owner Role Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Act
            var updateRequest = new UpdateDocumentRequest
            {
                Title = "Updated Title by Owner"
            };
            var response = await ownerClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Assert
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Editor", doc!.Role);
            Assert.Equal("Updated Title by Owner", doc.Title);
        }

        [Fact]
        public async Task UpdateDocument_AsMember_WithEditorPermission_ReturnsRoleEditor()
        {
            // Arrange
            var ownerEmail = $"role-update-memeditor-{Guid.NewGuid()}@test.com";
            var memberEmail = $"role-update-editor-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Update Editor Role Test",
                TeamName = "Update Editor Role Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member com Editor permission
            var memberId = await GetUserIdAsync(memberEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "Member User",
                    UserId = memberId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Editor,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Act
            var updateRequest = new UpdateDocumentRequest
            {
                Content = "<p>Content by editor member</p>"
            };
            var response = await memberClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Assert
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Editor", doc!.Role);
        }

        #endregion

        #region Viewer Cannot Edit (403)

        [Fact]
        public async Task UpdateDocument_AsMember_WithViewerPermission_ReturnsForbidden()
        {
            // Arrange
            var ownerEmail = $"role-update-viewer-{Guid.NewGuid()}@test.com";
            var memberEmail = $"role-viewer-noedit-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Viewer No Edit Test",
                TeamName = "Viewer No Edit Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member com Viewer permission
            var memberId = await GetUserIdAsync(memberEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "Viewer Member",
                    UserId = memberId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Viewer,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Act - Viewer tenta editar título
            var updateRequest = new UpdateDocumentRequest
            {
                Title = "Trying to Change Title"
            };
            var response = await memberClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Assert - Deve retornar 403
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

            // Verificar que o título não mudou
            var getResponse = await ownerClient.GetAsync($"/api/documents/{createdDoc!.Id}");
            var doc = await getResponse.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.Equal("Viewer No Edit Test", doc!.Title);
        }

        [Fact]
        public async Task UpdateDocument_AsMember_WithViewerPermission_CannotChangeContent()
        {
            // Arrange
            var ownerEmail = $"role-content-viewer-{Guid.NewGuid()}@test.com";
            var memberEmail = $"role-content-noedit-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Viewer No Content Test",
                TeamName = "Viewer No Content Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Owner adiciona conteúdo inicial
            var ownerUpdate = new UpdateDocumentRequest
            {
                Content = "<p>Original content by owner</p>"
            };
            await ownerClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", ownerUpdate);

            // Adicionar Member com Viewer permission
            var memberId = await GetUserIdAsync(memberEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "Viewer Member",
                    UserId = memberId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Viewer,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Act - Viewer tenta mudar conteúdo
            var updateRequest = new UpdateDocumentRequest
            {
                Content = "<p>Hacked content by viewer</p>"
            };
            var response = await memberClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Assert - Deve retornar 403
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

            // Verificar que o conteúdo não mudou
            var getResponse = await ownerClient.GetAsync($"/api/documents/{createdDoc!.Id}");
            var doc = await getResponse.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.Equal("<p>Original content by owner</p>", doc!.Content);
        }

        #endregion

        #region TeamAdmin Bypass - Pode editar mesmo com DocumentRole Viewer

        [Fact]
        public async Task UpdateDocument_AsTeamAdmin_WithViewerDocPermission_CanEdit()
        {
            // Arrange - TeamAdmin com DocumentPermission=Viewer deve conseguir editar (bypass)
            var ownerEmail = $"role-bypass-owner-{Guid.NewGuid()}@test.com";
            var adminEmail = $"role-bypass-admin-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var adminClient = CreateAuthenticatedClient(adminToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Admin Bypass Edit Test",
                TeamName = "Admin Bypass Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar como TeamAdmin com DocumentPermission = Viewer
            var adminUserId = await GetUserIdAsync(adminEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "Admin User",
                    UserId = adminUserId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.TeamAdmin,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Viewer,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Act - TeamAdmin (com DocRole Viewer) tenta editar
            var updateRequest = new UpdateDocumentRequest
            {
                Title = "Edited by Admin with Viewer DocRole",
                Content = "<p>Admin bypass content</p>"
            };
            var response = await adminClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Assert - Deve conseguir editar (bypass)
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Edited by Admin with Viewer DocRole", doc!.Title);
            Assert.Equal("Editor", doc.Role);
        }

        [Fact]
        public async Task UpdateDocument_AsTeamAdmin_WithoutDocPermission_CanEdit()
        {
            // Arrange - TeamAdmin sem DocumentPermission nenhuma deve conseguir editar (bypass)
            var ownerEmail = $"role-bypass-noperm-owner-{Guid.NewGuid()}@test.com";
            var adminEmail = $"role-bypass-noperm-admin-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var adminClient = CreateAuthenticatedClient(adminToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Admin No Perm Edit Test",
                TeamName = "Admin No Perm Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar como TeamAdmin SEM DocumentPermission
            var adminUserId = await GetUserIdAsync(adminEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "Admin User",
                    UserId = adminUserId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.TeamAdmin,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();
                // Nenhuma DocumentPermission criada!
            }

            // Act
            var updateRequest = new UpdateDocumentRequest
            {
                Title = "Edited by Admin without DocPerm"
            };
            var response = await adminClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Assert - Deve conseguir editar (bypass pela TeamRole)
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Edited by Admin without DocPerm", doc!.Title);
            Assert.Equal("Editor", doc.Role);
        }

        #endregion

        #region TeamRole Change - Member perde bypass ao ser rebaixado

        [Fact]
        public async Task UpdateDocument_TeamAdminDemotedToMember_WithViewerDocPermission_CannotEdit()
        {
            // Arrange - Utilizador é TeamAdmin (bypass), depois é rebaixado para Member
            // e a sua DocumentPermission é Viewer. Deve perder acesso de edição.
            var ownerEmail = $"role-demoted-owner-{Guid.NewGuid()}@test.com";
            var userEmail = $"role-demoted-user-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(userEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var userToken = await LoginAndGetTokenAsync(userEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var userClient = CreateAuthenticatedClient(userToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Demoted Admin Test",
                TeamName = "Demoted Admin Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar como TeamAdmin com DocumentPermission = Viewer
            var userId = await GetUserIdAsync(userEmail);
            int teamMemberId;
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "User",
                    UserId = userId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.TeamAdmin,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();
                teamMemberId = teamMember.Id;

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Viewer,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Verificar que enquanto é TeamAdmin, pode editar
            var updateRequest1 = new UpdateDocumentRequest { Title = "Edit as Admin works" };
            var response1 = await userClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest1);
            response1.EnsureSuccessStatusCode();

            // Rebaixar para Member
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
                var tm = await db.TeamMember.FindAsync(teamMemberId);
                tm!.Role = TeamRole.Member;
                await db.SaveChangesAsync();
            }

            // Act - Agora como Member com Viewer, tenta editar
            var updateRequest2 = new UpdateDocumentRequest { Title = "Edit as Member fails" };
            var response2 = await userClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest2);

            // Assert - Deve retornar 403 (já não tem bypass, e DocRole é Viewer)
            Assert.Equal(HttpStatusCode.Forbidden, response2.StatusCode);

            // Verificar que o título ficou o da primeira edição (não a segunda)
            var getResponse = await ownerClient.GetAsync($"/api/documents/{createdDoc!.Id}");
            var doc = await getResponse.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.Equal("Edit as Admin works", doc!.Title);
        }

        [Fact]
        public async Task GetDocument_TeamAdminDemotedToMember_WithViewerDocPermission_ReturnsViewer()
        {
            // Arrange - Mesmo cenário: após demoção, o role retornado deve ser "Viewer"
            var ownerEmail = $"role-demoted-role-owner-{Guid.NewGuid()}@test.com";
            var userEmail = $"role-demoted-role-user-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(userEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var userToken = await LoginAndGetTokenAsync(userEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var userClient = CreateAuthenticatedClient(userToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Demoted Role Response Test",
                TeamName = "Demoted Role Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar como TeamAdmin com DocPerm = Viewer
            var userId = await GetUserIdAsync(userEmail);
            int teamMemberId;
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "User",
                    UserId = userId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.TeamAdmin,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();
                teamMemberId = teamMember.Id;

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Viewer,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Verificar role como TeamAdmin
            var responseAdmin = await userClient.GetAsync($"/api/documents/{createdDoc!.Id}");
            responseAdmin.EnsureSuccessStatusCode();
            var docAdmin = await responseAdmin.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.Equal("Editor", docAdmin!.Role); // Bypass

            // Rebaixar para Member
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
                var tm = await db.TeamMember.FindAsync(teamMemberId);
                tm!.Role = TeamRole.Member;
                await db.SaveChangesAsync();
            }

            // Act - Obter documento como Member
            var responseMember = await userClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Agora deve retornar "Viewer"
            responseMember.EnsureSuccessStatusCode();
            var docMember = await responseMember.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.Equal("Viewer", docMember!.Role);
        }

        #endregion

        #region Edge Case - Member promovido a TeamAdmin ganha bypass

        [Fact]
        public async Task UpdateDocument_MemberPromotedToTeamAdmin_GainsBypass()
        {
            // Arrange - Member com Viewer DocPermission não pode editar,
            // mas ao ser promovido a TeamAdmin ganha bypass
            var ownerEmail = $"role-promoted-owner-{Guid.NewGuid()}@test.com";
            var userEmail = $"role-promoted-user-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(userEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var userToken = await LoginAndGetTokenAsync(userEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var userClient = CreateAuthenticatedClient(userToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Promoted Member Test",
                TeamName = "Promoted Member Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar como Member com DocPerm = Viewer
            var userId = await GetUserIdAsync(userEmail);
            int teamMemberId;
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

                var teamMember = new TeamMember
                {
                    Name = "User",
                    UserId = userId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();
                teamMemberId = teamMember.Id;

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Viewer,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Verificar que como Member com Viewer não pode editar
            var updateFail = new UpdateDocumentRequest { Title = "Should fail" };
            var responseFail = await userClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateFail);
            Assert.Equal(HttpStatusCode.Forbidden, responseFail.StatusCode);

            // Promover a TeamAdmin
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
                var tm = await db.TeamMember.FindAsync(teamMemberId);
                tm!.Role = TeamRole.TeamAdmin;
                await db.SaveChangesAsync();
            }

            // Act - Agora como TeamAdmin tenta editar
            var updateSuccess = new UpdateDocumentRequest { Title = "Edited after promotion" };
            var responseSuccess = await userClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateSuccess);

            // Assert - Deve conseguir editar (agora tem bypass)
            responseSuccess.EnsureSuccessStatusCode();
            var doc = await responseSuccess.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Edited after promotion", doc!.Title);
            Assert.Equal("Editor", doc.Role);
        }

        #endregion

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
