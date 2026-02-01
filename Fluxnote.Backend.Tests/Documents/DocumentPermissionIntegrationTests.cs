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
    public class DocumentPermissionIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public DocumentPermissionIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        #region CREATE - DocumentPermission Creation

        [Fact]
        public async Task CreateDocument_AsOwner_CreatesDocumentPermission()
        {
            // Arrange - Criar utilizador Owner
            var ownerEmail = $"doc-perm-owner-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            var request = new CreateDocumentRequest
            {
                Title = "Document with Permission",
                TeamName = "Owner Team"
            };

            // Act - Criar documento
            var response = await ownerClient.PostAsJsonAsync("/api/documents", request);
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDto>();

            // Assert - Verificar que DocumentPermission foi criado
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();

            var ownerId = await GetUserIdAsync(ownerEmail);
            var ownerTeamMember = await db.TeamMember
                .FirstOrDefaultAsync(m => m.UserId == ownerId && m.TeamId == doc!.TeamId && m.Role == TeamRole.Owner);

            Assert.NotNull(ownerTeamMember);

            var documentPermission = await db.DocumentPermission
                .FirstOrDefaultAsync(dp => dp.TeamMemberId == ownerTeamMember.Id && dp.DocumentId == doc!.Id);

            Assert.NotNull(documentPermission);
            Assert.Equal(DocumentRole.Editor, documentPermission!.Role);
        }

        #endregion

        #region READ - Owner sees all documents

        [Fact]
        public async Task GetDocuments_AsOwner_SeesAllTeamDocuments_WithoutExplicitPermission()
        {
            // Arrange - Criar Owner e documento
            var ownerEmail = $"doc-owner-all-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            // Criar documento (cria automaticamente equipa e torna Owner)
            var docRequest = new CreateDocumentRequest
            {
                Title = "Owner's Document",
                TeamName = "Owner's Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Remover DocumentPermission explicitamente para testar que Owner vê mesmo sem ele
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
                var ownerId = await GetUserIdAsync(ownerEmail);
                var ownerTeamMember = await db.TeamMember
                    .FirstOrDefaultAsync(m => m.UserId == ownerId && m.TeamId == createdDoc!.TeamId && m.Role == TeamRole.Owner);

                var permission = await db.DocumentPermission
                    .FirstOrDefaultAsync(dp => dp.TeamMemberId == ownerTeamMember!.Id && dp.DocumentId == createdDoc!.Id);

                if (permission != null)
                {
                    db.DocumentPermission.Remove(permission);
                    await db.SaveChangesAsync();
                }
            }

            // Act - Owner obtém lista de documentos
            var response = await ownerClient.GetAsync("/api/documents");

            // Assert - Owner deve ver o documento mesmo sem DocumentPermission explícito
            response.EnsureSuccessStatusCode();
            var documents = await response.Content.ReadFromJsonAsync<List<DocumentDto>>();
            Assert.NotNull(documents);
            Assert.Contains(documents, d => d.Id == createdDoc!.Id && d.Title == "Owner's Document");
        }

        #endregion

        #region READ - Member without DocumentPermission

        [Fact]
        public async Task GetDocuments_AsMember_WithoutDocumentPermission_DoesNotSeeDocuments()
        {
            // Arrange - Criar Owner e Member
            var ownerEmail = $"doc-owner-noaccess-{Guid.NewGuid()}@test.com";
            var memberEmail = $"doc-member-noaccess-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria documento e equipa
            var docRequest = new CreateDocumentRequest
            {
                Title = "Private Document",
                TeamName = "Private Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member à equipa (sem DocumentPermission)
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
            }

            // Act - Member tenta obter lista de documentos
            var response = await memberClient.GetAsync("/api/documents");

            // Assert - Member não deve ver o documento (sem DocumentPermission)
            response.EnsureSuccessStatusCode();
            var documents = await response.Content.ReadFromJsonAsync<List<DocumentDto>>();
            Assert.NotNull(documents);
            Assert.DoesNotContain(documents, d => d.Id == createdDoc!.Id);
        }

        [Fact]
        public async Task GetDocumentById_AsMember_WithoutDocumentPermission_ReturnsForbidden()
        {
            // Arrange - Criar Owner e Member
            var ownerEmail = $"doc-owner-getforbidden-{Guid.NewGuid()}@test.com";
            var memberEmail = $"doc-member-getforbidden-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Restricted Document",
                TeamName = "Restricted Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member à equipa (sem DocumentPermission)
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
            }

            // Act - Member tenta aceder ao documento diretamente
            var response = await memberClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Deve retornar 403 Forbidden
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        #endregion

        #region READ - Member with DocumentPermission (Viewer)

        [Fact]
        public async Task GetDocuments_AsMember_WithViewerPermission_SeesDocument()
        {
            // Arrange - Criar Owner e Member
            var ownerEmail = $"doc-owner-viewer-{Guid.NewGuid()}@test.com";
            var memberEmail = $"doc-member-viewer-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Viewable Document",
                TeamName = "Viewable Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member à equipa e criar DocumentPermission com Role = Viewer
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

            // Act - Member obtém lista de documentos
            var response = await memberClient.GetAsync("/api/documents");

            // Assert - Member deve ver o documento
            response.EnsureSuccessStatusCode();
            var documents = await response.Content.ReadFromJsonAsync<List<DocumentDto>>();
            Assert.NotNull(documents);
            Assert.Contains(documents, d => d.Id == createdDoc!.Id && d.Title == "Viewable Document");
        }

        [Fact]
        public async Task GetDocumentById_AsMember_WithViewerPermission_CanAccessDocument()
        {
            // Arrange - Criar Owner e Member com Viewer permission
            var ownerEmail = $"doc-owner-viewer2-{Guid.NewGuid()}@test.com";
            var memberEmail = $"doc-member-viewer2-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Viewable Document 2",
                TeamName = "Viewable Team 2"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member e criar DocumentPermission com Role = Viewer
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

            // Act - Member acede ao documento
            var response = await memberClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Deve conseguir aceder
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal(createdDoc.Id, doc!.Id);
        }

        #endregion

        #region UPDATE - Member with DocumentPermission (Editor)

        [Fact]
        public async Task UpdateDocument_AsMember_WithEditorPermission_CanEdit()
        {
            // Arrange - Criar Owner e Member com Editor permission
            var ownerEmail = $"doc-owner-editor-{Guid.NewGuid()}@test.com";
            var memberEmail = $"doc-member-editor-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Editable Document",
                TeamName = "Editable Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member e criar DocumentPermission com Role = Editor
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

            // Act - Member tenta editar o documento
            var updateRequest = new UpdateDocumentRequest
            {
                Title = "Updated by Member",
                Content = "<p>Updated content</p>"
            };
            var response = await memberClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Assert - Deve conseguir editar
            response.EnsureSuccessStatusCode();
            var updatedDoc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(updatedDoc);
            Assert.Equal("Updated by Member", updatedDoc!.Title);
        }

        [Fact]
        public async Task UpdateDocument_AsMember_WithViewerPermission_CannotEdit()
        {
            // Arrange - Criar Owner e Member com Viewer permission
            var ownerEmail = $"doc-owner-viewer-edit-{Guid.NewGuid()}@test.com";
            var memberEmail = $"doc-member-viewer-edit-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "View Only Document",
                TeamName = "View Only Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member e criar DocumentPermission com Role = Viewer
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

            // Act - Member tenta editar o documento
            var updateRequest = new UpdateDocumentRequest
            {
                Title = "Trying to Edit",
                Content = "<p>Unauthorized content</p>"
            };
            var response = await memberClient.PutAsJsonAsync($"/api/documents/{createdDoc!.Id}", updateRequest);

            // Assert - Deve retornar 403 Forbidden
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task GetDocuments_AsMember_WithEditorPermission_SeesDocument()
        {
            // Arrange - Criar Owner e Member com Editor permission
            var ownerEmail = $"doc-owner-editor-list-{Guid.NewGuid()}@test.com";
            var memberEmail = $"doc-member-editor-list-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Editable Document for List",
                TeamName = "Editable Team for List"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member e criar DocumentPermission com Role = Editor
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

            // Act - Member obtém lista de documentos
            var response = await memberClient.GetAsync("/api/documents");

            // Assert - Member deve ver o documento
            response.EnsureSuccessStatusCode();
            var documents = await response.Content.ReadFromJsonAsync<List<DocumentDto>>();
            Assert.NotNull(documents);
            Assert.Contains(documents, d => d.Id == createdDoc!.Id && d.Title == "Editable Document for List");
        }

        #endregion

        #region DELETE - Owner can delete, Member cannot

        [Fact]
        public async Task DeleteDocument_AsOwner_CanDelete()
        {
            // Arrange - Criar Owner e documento
            var ownerEmail = $"doc-owner-delete-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var ownerClient = CreateAuthenticatedClient(ownerToken);

            // Criar documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Document to Delete",
                TeamName = "Team for Delete"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Act - Owner elimina o documento
            var response = await ownerClient.DeleteAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Deve conseguir eliminar
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

            // Verificar que o documento foi marcado como eliminado
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
            var deletedDoc = await db.Document.FirstOrDefaultAsync(d => d.Id == createdDoc.Id);
            Assert.NotNull(deletedDoc);
            Assert.True(deletedDoc!.IsDeleted);
        }

        [Fact]
        public async Task DeleteDocument_AsMember_CannotDelete()
        {
            // Arrange - Criar Owner e Member
            var ownerEmail = $"doc-owner-nodelete-{Guid.NewGuid()}@test.com";
            var memberEmail = $"doc-member-nodelete-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Protected Document",
                TeamName = "Protected Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member à equipa com Editor permission
            var memberId = await GetUserIdAsync(memberEmail);
            using (var inscope = _factory.Services.CreateScope())
            {
                var bd = inscope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
                
                var teamMember = new TeamMember
                {
                    Name = "Member User",
                    UserId = memberId,
                    TeamId = createdDoc!.TeamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };
                bd.TeamMember.Add(teamMember);
                await bd.SaveChangesAsync();

                var documentPermission = new DocumentPermission
                {
                    TeamMemberId = teamMember.Id,
                    DocumentId = createdDoc.Id,
                    Role = DocumentRole.Editor,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                bd.DocumentPermission.Add(documentPermission);
                await bd.SaveChangesAsync();
            }

            // Act - Member tenta eliminar o documento
            var response = await memberClient.DeleteAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Deve retornar 403 Forbidden
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

            // Verificar que o documento NÃO foi eliminado
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FluxnoteServerContext>();
            var doc = await db.Document.FirstOrDefaultAsync(d => d.Id == createdDoc.Id);
            Assert.NotNull(doc);
            Assert.False(doc!.IsDeleted);
        }

        [Fact]
        public async Task DeleteDocument_AsMember_WithoutPermission_CannotDelete()
        {
            // Arrange - Criar Owner e Member sem DocumentPermission
            var ownerEmail = $"doc-owner-nodelete2-{Guid.NewGuid()}@test.com";
            var memberEmail = $"doc-member-nodelete2-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Protected Document 2",
                TeamName = "Protected Team 2"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            createResponse.EnsureSuccessStatusCode();
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar Member à equipa (sem DocumentPermission)
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
            }

            // Act - Member tenta eliminar o documento
            var response = await memberClient.DeleteAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Deve retornar 403 Forbidden (não é membro da equipa ou não é Owner)
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
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


