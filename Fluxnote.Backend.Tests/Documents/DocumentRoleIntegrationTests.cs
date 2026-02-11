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
    /// - Owner recebe sempre role "Editor" (bypass à DocumentRole)
    /// - TeamAdmin e Members recebem a role da sua DocumentPermission (sem bypass)
    /// - TeamAdmin precisa de DocumentPermission explícita (sempre Editor na prática)
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
        public async Task GetDocument_AsTeamAdmin_WithEditorPermission_ReturnsRoleEditor()
        {
            // Arrange - Owner cria documento, depois adiciona TeamAdmin com Editor DocPerm
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

            // Adicionar TeamAdmin com DocumentPermission = Editor (TeamAdmin é sempre Editor)
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
                    Role = DocumentRole.Editor,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Act
            var response = await adminClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - TeamAdmin com Editor DocPerm deve receber role "Editor"
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Editor", doc!.Role);
        }

        [Fact]
        public async Task GetDocument_AsTeamAdmin_WithoutDocPermission_ReturnsForbidden()
        {
            // Arrange - TeamAdmin sem DocumentPermission não consegue aceder (sem bypass)
            var ownerEmail = $"role-owner-admin-noperm-{Guid.NewGuid()}@test.com";
            var adminEmail = $"role-admin-noperm-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var adminClient = CreateAuthenticatedClient(adminToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "Admin No Permission Test",
                TeamName = "Admin No Permission Team"
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
            }

            // Act
            var response = await adminClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - TeamAdmin sem DocPerm deve receber 403
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
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

        #region TeamAdmin Precisa de DocumentPermission

        [Fact]
        public async Task UpdateDocument_AsTeamAdmin_WithEditorDocPermission_CanEdit()
        {
            // Arrange - TeamAdmin com DocumentPermission=Editor deve conseguir editar
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
                Title = "Admin Editor Edit Test",
                TeamName = "Admin Editor Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar como TeamAdmin com DocumentPermission = Editor
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
                    Role = DocumentRole.Editor,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                db.DocumentPermission.Add(documentPermission);
                await db.SaveChangesAsync();
            }

            // Act - TeamAdmin com Editor DocPerm tenta editar
            var updateRequest = new UpdateDocumentRequest
            {
                Title = "Edited by Admin with Editor DocRole",
                Content = "<p>Admin editor content</p>"
            };
            var response = await adminClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Assert - Deve conseguir editar
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal("Edited by Admin with Editor DocRole", doc!.Title);
            Assert.Equal("Editor", doc.Role);
        }

        [Fact]
        public async Task UpdateDocument_AsTeamAdmin_WithoutDocPermission_ReturnsForbidden()
        {
            // Arrange - TeamAdmin sem DocumentPermission não consegue editar (sem bypass)
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

            // Assert - Deve retornar 403 (sem bypass, sem DocumentPermission)
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task CreateDocumentPermission_ForTeamAdmin_RequestedViewerRole_AutoForcedToEditor()
        {
            // Arrange - Owner cria documento, adiciona TeamAdmin à equipa,
            // depois adiciona DocPerm com Viewer pedido → deve ser forçado para Editor
            var ownerEmail = $"role-ta-autoperm-owner-{Guid.NewGuid()}@test.com";
            var adminEmail = $"role-ta-autoperm-admin-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(adminEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var adminToken = await LoginAndGetTokenAsync(adminEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var adminClient = CreateAuthenticatedClient(adminToken);

            var docRequest = new CreateDocumentRequest
            {
                Title = "TeamAdmin Auto Editor Test",
                TeamName = "TeamAdmin Auto Editor Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Owner adiciona user como TeamAdmin
            var adminUserId = await GetUserIdAsync(adminEmail);
            var addMemberResponse = await ownerClient.PostAsJsonAsync("/api/teamMembers", new
            {
                Name = "Admin User",
                Role = 1, // TeamAdmin
                TeamId = createdDoc!.TeamId,
                UserId = adminUserId
            });
            addMemberResponse.EnsureSuccessStatusCode();
            var addedMember = await addMemberResponse.Content.ReadFromJsonAsync<TeamMember>();

            // Act - Owner adiciona DocPerm com Viewer pedido para o TeamAdmin
            var addPermResponse = await ownerClient.PostAsJsonAsync("/api/documentPermissions", new
            {
                DocumentId = createdDoc.Id,
                TeamMemberId = addedMember!.Id,
                Role = 0 // Viewer pedido
            });
            addPermResponse.EnsureSuccessStatusCode();
            var permDto = await addPermResponse.Content.ReadFromJsonAsync<DocumentPermissionDto>();

            // Assert - DocumentRole deve ser Editor (auto-forçado), não Viewer
            Assert.Equal(1, permDto!.DocumentRole); // Editor = 1

            // Assert - TeamAdmin deve conseguir editar o documento
            var updateRequest = new UpdateDocumentRequest { Title = "Edited by TeamAdmin" };
            var updateResponse = await adminClient.PutAsJsonAsync($"/api/documents/{createdDoc.Id}", updateRequest);
            updateResponse.EnsureSuccessStatusCode();
            var doc = await updateResponse.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.Equal("Edited by TeamAdmin", doc!.Title);
            Assert.Equal("Editor", doc.Role);
        }

        #endregion

        #region TeamRole Change - Demoção e impacto nas permissões

        [Fact]
        public async Task UpdateDocument_TeamAdminDemotedToMember_KeepsEditorDocPermission_CanStillEdit()
        {
            // Arrange - TeamAdmin com Editor DocPerm é rebaixado para Member via endpoint.
            // Como a DocPerm permanece Editor, deve continuar a poder editar.
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

            // Owner adiciona user como TeamAdmin via endpoint
            var userId = await GetUserIdAsync(userEmail);
            var addMemberResponse = await ownerClient.PostAsJsonAsync("/api/teamMembers", new
            {
                Name = "User",
                Role = 1, // TeamAdmin
                TeamId = createdDoc!.TeamId,
                UserId = userId
            });
            addMemberResponse.EnsureSuccessStatusCode();
            var addedMember = await addMemberResponse.Content.ReadFromJsonAsync<TeamMember>();
            var teamMemberId = addedMember!.Id;

            // Owner adiciona DocPerm via endpoint (auto-forced to Editor para TeamAdmin)
            var addPermResponse = await ownerClient.PostAsJsonAsync("/api/documentPermissions", new
            {
                DocumentId = createdDoc.Id,
                TeamMemberId = teamMemberId,
                Role = 0 // Viewer pedido, auto-forçado para Editor
            });
            addPermResponse.EnsureSuccessStatusCode();
            var addedPerm = await addPermResponse.Content.ReadFromJsonAsync<DocumentPermissionDto>();
            var docPermissionId = addedPerm!.Id;

            // Verificar que enquanto é TeamAdmin com Editor, pode editar
            var updateRequest1 = new UpdateDocumentRequest { Title = "Edit as Admin works" };
            var response1 = await userClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest1);
            response1.EnsureSuccessStatusCode();

            // Owner rebaixa para Member via endpoint (DocPerm permanece Editor)
            var demoteResponse = await ownerClient.PutAsJsonAsync(
                $"/api/teamMembers/{teamMemberId}",
                new { Role = 0 } // Member
            );
            demoteResponse.EnsureSuccessStatusCode();

            // Act - Agora como Member com Editor DocPerm, tenta editar
            var updateRequest2 = new UpdateDocumentRequest { Title = "Edit as Member with Editor" };
            var response2 = await userClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest2);

            // Assert - Deve conseguir editar (DocPerm é Editor)
            response2.EnsureSuccessStatusCode();
            var doc = await response2.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.Equal("Edit as Member with Editor", doc!.Title);
            Assert.Equal("Editor", doc.Role);

            // Owner muda a DocPerm para Viewer via endpoint → já não pode editar
            var changePermResponse = await ownerClient.PutAsJsonAsync(
                $"/api/documentPermissions/{docPermissionId}",
                new { Role = 0 } // Viewer
            );
            changePermResponse.EnsureSuccessStatusCode();

            var updateRequest3 = new UpdateDocumentRequest { Title = "Edit as Member fails" };
            var response3 = await userClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest3);
            Assert.Equal(HttpStatusCode.Forbidden, response3.StatusCode);
        }

        [Fact]
        public async Task GetDocument_TeamAdminDemotedToMember_WithEditorDocPermission_ReturnsEditor()
        {
            // Arrange - Após demoção para Member via endpoint, a DocPerm permanece Editor
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

            // Owner adiciona user como TeamAdmin via endpoint
            var userId = await GetUserIdAsync(userEmail);
            var addMemberResponse = await ownerClient.PostAsJsonAsync("/api/teamMembers", new
            {
                Name = "User",
                Role = 1, // TeamAdmin
                TeamId = createdDoc!.TeamId,
                UserId = userId
            });
            addMemberResponse.EnsureSuccessStatusCode();
            var addedMember = await addMemberResponse.Content.ReadFromJsonAsync<TeamMember>();
            var teamMemberId = addedMember!.Id;

            // Owner adiciona DocPerm via endpoint (auto-forced to Editor para TeamAdmin)
            var addPermResponse = await ownerClient.PostAsJsonAsync("/api/documentPermissions", new
            {
                DocumentId = createdDoc.Id,
                TeamMemberId = teamMemberId,
                Role = 0 // Viewer pedido, auto-forçado para Editor
            });
            addPermResponse.EnsureSuccessStatusCode();

            // Verificar role como TeamAdmin com Editor
            var responseAdmin = await userClient.GetAsync($"/api/documents/{createdDoc!.Id}");
            responseAdmin.EnsureSuccessStatusCode();
            var docAdmin = await responseAdmin.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.Equal("Editor", docAdmin!.Role);

            // Owner rebaixa para Member via endpoint (DocPerm permanece Editor)
            var demoteResponse = await ownerClient.PutAsJsonAsync(
                $"/api/teamMembers/{teamMemberId}",
                new { Role = 0 } // Member
            );
            demoteResponse.EnsureSuccessStatusCode();

            // Act - Obter documento como Member
            var responseMember = await userClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Deve retornar "Editor" (DocPerm permanece Editor após demoção)
            responseMember.EnsureSuccessStatusCode();
            var docMember = await responseMember.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.Equal("Editor", docMember!.Role);
        }

        #endregion

        #region Edge Case - Member promovido a TeamAdmin recebe Editor (via endpoint)

        [Fact]
        public async Task UpdateDocument_MemberPromotedToTeamAdmin_EndpointUpgradesDocPermToEditor()
        {
            // Arrange - Member com Viewer DocPermission não pode editar.
            // Owner promove via PUT /api/teamMembers/{id} com role=1 (TeamAdmin).
            // O endpoint deve atualizar automaticamente todas as DocPerms para Editor.
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

            // Owner adiciona user como Member via endpoint
            var userId = await GetUserIdAsync(userEmail);
            var addMemberResponse = await ownerClient.PostAsJsonAsync("/api/teamMembers", new
            {
                Name = "User",
                Role = 0, // Member
                TeamId = createdDoc!.TeamId,
                UserId = userId
            });
            addMemberResponse.EnsureSuccessStatusCode();
            var addedMember = await addMemberResponse.Content.ReadFromJsonAsync<TeamMember>();
            var teamMemberId = addedMember!.Id;

            // Owner adiciona DocPerm como Viewer via endpoint
            var addPermResponse = await ownerClient.PostAsJsonAsync("/api/documentPermissions", new
            {
                DocumentId = createdDoc.Id,
                TeamMemberId = teamMemberId,
                Role = 0 // Viewer
            });
            addPermResponse.EnsureSuccessStatusCode();
            var addedPerm = await addPermResponse.Content.ReadFromJsonAsync<DocumentPermissionDto>();
            var docPermissionId = addedPerm!.Id;

            // Verificar que como Member com Viewer não pode editar
            var updateFail = new UpdateDocumentRequest { Title = "Should fail" };
            var responseFail = await userClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateFail);
            Assert.Equal(HttpStatusCode.Forbidden, responseFail.StatusCode);

            // Owner promove o Member para TeamAdmin via endpoint
            var promoteResponse = await ownerClient.PutAsJsonAsync(
                $"/api/teamMembers/{teamMemberId}",
                new { Role = 1 } // TeamAdmin
            );
            promoteResponse.EnsureSuccessStatusCode();

            // Verificar na BD que a DocPerm foi automaticamente atualizada para Editor
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
                var dp = await db.DocumentPermission.FindAsync(docPermissionId);
                Assert.NotNull(dp);
                Assert.Equal(DocumentRole.Editor, dp!.Role);
            }

            // Act - Agora como TeamAdmin com Editor DocPerm (atualizada pelo endpoint) tenta editar
            var updateSuccess = new UpdateDocumentRequest { Title = "Edited after promotion" };
            var responseSuccess = await userClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateSuccess);

            // Assert - Deve conseguir editar (DocPerm foi atualizada automaticamente para Editor)
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
