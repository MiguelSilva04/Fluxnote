using Fluxnote.Backend.Contracts.Auth;
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
    public class DocumentIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public DocumentIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        #region POST /api/documents

        [Fact]
        public async Task PostDocument_WithNewTeam_CreatesDocumentAndTeam()
        {
            // Arrange - Preparar utilizador e cliente autenticado
            var email = $"doc-newteam-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var request = new CreateDocumentRequest
            {
                Title = "Document with New Team",
                TeamName = "Auto Created Team"
            };

            // Act - Criar documento com nova equipa
            var response = await authClient.PostAsJsonAsync("/api/documents", request);

            // Assert - Verificar se foi criado com sucesso
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var doc = await response.Content.ReadFromJsonAsync<DocumentDto>();
            Assert.NotNull(doc);
            Assert.Equal("Document with New Team", doc!.Title);
            Assert.Equal("Auto Created Team", doc.TeamName);
            Assert.False(doc.IsDeleted);
        }

        [Fact]
        public async Task PostDocument_WithExistingTeamAsOwner_CreatesDocument()
        {
            // Arrange - Preparar utilizador e cliente autenticado
            var email = $"doc-existingteam-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Primeiro criar um documento com nova equipa (cria automaticamente a equipa e torna o utilizador Owner)
            var firstDocRequest = new CreateDocumentRequest
            {
                Title = "First Document",
                TeamName = "Existing Team for Doc"
            };
            var firstDocResponse = await authClient.PostAsJsonAsync("/api/documents", firstDocRequest);
            firstDocResponse.EnsureSuccessStatusCode();
            var firstDoc = await firstDocResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Agora criar segundo documento na equipa existente usando TeamId
            var request = new CreateDocumentRequest
            {
                Title = "Document in Existing Team",
                TeamId = firstDoc!.TeamId
            };

            // Act - Criar documento na equipa existente
            var response = await authClient.PostAsJsonAsync("/api/documents", request);

            // Assert - Verificar se foi criado na mesma equipa
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var doc = await response.Content.ReadFromJsonAsync<DocumentDto>();
            Assert.NotNull(doc);
            Assert.Equal("Document in Existing Team", doc!.Title);
            Assert.Equal(firstDoc.TeamId, doc.TeamId);
            Assert.Equal(firstDoc.TeamName, doc.TeamName);
        }

        [Fact]
        public async Task PostDocument_WithoutAuth_ReturnsUnauthorized()
        {
            // Arrange - Preparar pedido sem autenticação
            var request = new CreateDocumentRequest
            {
                Title = "Unauthorized Document",
                TeamName = "Some Team"
            };

            // Act - Tentar criar documento sem autenticação
            var response = await _client.PostAsJsonAsync("/api/documents", request);

            // Assert - Verificar que retorna 401 Unauthorized
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task PostDocument_WithTeamWhereNotOwner_ReturnsForbidden()
        {
            // Arrange - Criar dois utilizadores
            var ownerEmail = $"doc-owner-{Guid.NewGuid()}@test.com";
            var memberEmail = $"doc-member-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(memberEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var memberToken = await LoginAndGetTokenAsync(memberEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var memberClient = CreateAuthenticatedClient(memberToken);

            // Owner cria um documento (que cria automaticamente uma equipa e torna o owner como Owner)
            var ownerDocRequest = new CreateDocumentRequest
            {
                Title = "Owner's First Document",
                TeamName = "Owner's Team"
            };
            var ownerDocResponse = await ownerClient.PostAsJsonAsync("/api/documents", ownerDocRequest);
            ownerDocResponse.EnsureSuccessStatusCode();
            var ownerDoc = await ownerDocResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Adicionar membro à equipa como Member (não Owner) - usando acesso direto à BD
            var memberId = await GetUserIdAsync(memberEmail);
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<Fluxnote.Backend.Data.FluxnoteServerContext>();
                var teamMember = new TeamMember
                {
                    Name = "Member User",
                    UserId = memberId,
                    TeamId = ownerDoc!.TeamId,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                };
                db.TeamMember.Add(teamMember);
                await db.SaveChangesAsync();
            }

            // Membro tenta criar documento na equipa
            var docRequest = new CreateDocumentRequest
            {
                Title = "Member's Document",
                TeamId = ownerDoc!.TeamId
            };

            // Act - Tentar criar documento como membro (não Owner)
            var response = await memberClient.PostAsJsonAsync("/api/documents", docRequest);

            // Assert - Verificar que retorna 403 Forbidden
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task PostDocument_WithNonExistentTeam_ReturnsNotFound()
        {
            // Arrange - Preparar utilizador e cliente autenticado
            var email = $"doc-notfound-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var request = new CreateDocumentRequest
            {
                Title = "Document for Non-Existent Team",
                TeamId = 999999 // ID de equipa inexistente
            };

            // Act - Tentar criar documento numa equipa que não existe
            var response = await authClient.PostAsJsonAsync("/api/documents", request);

            // Assert - Verificar que retorna 404 Not Found
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task PostDocument_ExceedingLimit_ReturnsBadRequest()
        {
            // Arrange - Preparar utilizador e criar 10 documentos (limite Free)
            var email = $"doc-limit-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Criar 10 documentos (o limite para o plano Free)
            for (int i = 0; i < 10; i++)
            {
                var docRequest = new CreateDocumentRequest
                {
                    Title = $"Document {i + 1}",
                    TeamName = $"Team for Doc {i + 1}"
                };
                var docResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
                Assert.Equal(HttpStatusCode.Created, docResponse.StatusCode);
            }

            // Tentar criar o 11º documento
            var request = new CreateDocumentRequest
            {
                Title = "Document 11 - Over Limit",
                TeamName = "Team for Doc 11"
            };

            // Act - Tentar criar documento além do limite
            var response = await authClient.PostAsJsonAsync("/api/documents", request);

            // Assert - Verificar que retorna 400 Bad Request
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task PostDocument_WithoutTeamIdAndWithoutTeamName_ReturnsBadRequest()
        {
            // Arrange - Preparar utilizador e pedido sem TeamId nem TeamName
            var email = $"doc-noteamname-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var request = new CreateDocumentRequest
            {
                Title = "Document Without Team Info"
                // Sem TeamId e sem TeamName
            };

            // Act - Tentar criar documento sem informação de equipa
            var response = await authClient.PostAsJsonAsync("/api/documents", request);

            // Assert - Verificar que retorna 400 Bad Request
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        #endregion

        #region GET /api/documents

        [Fact]
        public async Task GetDocuments_WithAuth_ReturnsDocumentList()
        {
            // Arrange - Preparar utilizador e criar documento
            var email = $"doc-list-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Criar primeiro um documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Test Document for List",
                TeamName = "Team for List Test"
            };
            await authClient.PostAsJsonAsync("/api/documents", docRequest);

            // Act - Obter lista de documentos
            var response = await authClient.GetAsync("/api/documents");

            // Assert - Verificar que retorna lista com documentos
            response.EnsureSuccessStatusCode();
            var documents = await response.Content.ReadFromJsonAsync<List<DocumentDto>>();
            Assert.NotNull(documents);
            Assert.NotEmpty(documents);
        }

        [Fact]
        public async Task GetDocuments_WithoutAuth_ReturnsUnauthorized()
        {
            // Act - Tentar obter documentos sem autenticação
            var response = await _client.GetAsync("/api/documents");

            // Assert - Verificar que retorna 401 Unauthorized
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetDocuments_FilteredByTeamId_ReturnsOnlyTeamDocuments()
        {
            // Arrange - Preparar utilizador e criar documentos em equipas diferentes
            var email = $"doc-filter-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Criar documento na Equipa A
            var docRequestA = new CreateDocumentRequest
            {
                Title = "Document in Team A",
                TeamName = "Team A"
            };
            var responseA = await authClient.PostAsJsonAsync("/api/documents", docRequestA);
            var docA = await responseA.Content.ReadFromJsonAsync<DocumentDto>();

            // Criar documento na Equipa B
            var docRequestB = new CreateDocumentRequest
            {
                Title = "Document in Team B",
                TeamName = "Team B"
            };
            await authClient.PostAsJsonAsync("/api/documents", docRequestB);

            // Act - Filtrar apenas pela Equipa A
            var response = await authClient.GetAsync($"/api/documents?teamId={docA!.TeamId}");

            // Assert - Verificar que retorna apenas documentos da Equipa A
            response.EnsureSuccessStatusCode();
            var documents = await response.Content.ReadFromJsonAsync<List<DocumentDto>>();
            Assert.NotNull(documents);
            Assert.All(documents, d => Assert.Equal(docA.TeamId, d.TeamId));
        }

        [Fact]
        public async Task GetDocuments_WithSearch_ReturnsMatchingDocuments()
        {
            // Arrange - Preparar utilizador e criar documento com título único
            var email = $"doc-search-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            var uniqueTitle = $"UniqueSearchTerm{Guid.NewGuid()}";

            // Criar documento com título único
            var docRequest = new CreateDocumentRequest
            {
                Title = uniqueTitle,
                TeamName = "Team for Search"
            };
            await authClient.PostAsJsonAsync("/api/documents", docRequest);

            // Act - Pesquisar pelo título único
            var response = await authClient.GetAsync($"/api/documents?search={uniqueTitle}");

            // Assert - Verificar que retorna o documento com o título pesquisado
            response.EnsureSuccessStatusCode();
            var documents = await response.Content.ReadFromJsonAsync<List<DocumentDto>>();
            Assert.NotNull(documents);
            Assert.Contains(documents, d => d.Title == uniqueTitle);
        }

        #endregion

        #region GET /api/documents/{id}

        [Fact]
        public async Task GetDocumentById_AsTeamMember_ReturnsDocument()
        {
            // Arrange - Preparar utilizador e criar documento
            var email = $"doc-getid-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Criar um documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Document to Get by ID",
                TeamName = "Team for GetById"
            };
            var createResponse = await authClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Act - Obter documento por ID
            var response = await authClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Verificar que retorna o documento correto
            response.EnsureSuccessStatusCode();
            var doc = await response.Content.ReadFromJsonAsync<DocumentDetailDto>();
            Assert.NotNull(doc);
            Assert.Equal(createdDoc.Id, doc!.Id);
            Assert.Equal("Document to Get by ID", doc.Title);
        }

        [Fact]
        public async Task GetDocumentById_WithoutAuth_ReturnsUnauthorized()
        {
            // Act - Tentar obter documento sem autenticação
            var response = await _client.GetAsync("/api/documents/1");

            // Assert - Verificar que retorna 401 Unauthorized
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetDocumentById_AsNonMember_ReturnsForbidden()
        {
            // Arrange - Criar dois utilizadores
            var ownerEmail = $"doc-owner2-{Guid.NewGuid()}@test.com";
            var otherEmail = $"doc-other-{Guid.NewGuid()}@test.com";

            await CreateAndConfirmUserAsync(ownerEmail, "Teste1234!");
            await CreateAndConfirmUserAsync(otherEmail, "Teste1234!");

            var ownerToken = await LoginAndGetTokenAsync(ownerEmail, "Teste1234!");
            var otherToken = await LoginAndGetTokenAsync(otherEmail, "Teste1234!");

            var ownerClient = CreateAuthenticatedClient(ownerToken);
            var otherClient = CreateAuthenticatedClient(otherToken);

            // Owner cria documento
            var docRequest = new CreateDocumentRequest
            {
                Title = "Private Document",
                TeamName = "Private Team"
            };
            var createResponse = await ownerClient.PostAsJsonAsync("/api/documents", docRequest);
            var createdDoc = await createResponse.Content.ReadFromJsonAsync<DocumentDto>();

            // Act - Outro utilizador tenta aceder ao documento
            var response = await otherClient.GetAsync($"/api/documents/{createdDoc!.Id}");

            // Assert - Verificar que retorna 403 Forbidden
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task GetDocumentById_NotFound_ReturnsNotFound()
        {
            // Arrange - Preparar utilizador autenticado
            var email = $"doc-notfound2-{Guid.NewGuid()}@test.com";
            await CreateAndConfirmUserAsync(email, "Teste1234!");
            var token = await LoginAndGetTokenAsync(email, "Teste1234!");
            var authClient = CreateAuthenticatedClient(token);

            // Act - Tentar obter documento que não existe
            var response = await authClient.GetAsync("/api/documents/999999");

            // Assert - Verificar que retorna 404 Not Found
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
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
            var db = scope.ServiceProvider.GetRequiredService<Fluxnote.Backend.Data.FluxnoteServerContext>();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user?.Id ?? "";
        }

        #endregion
    }
}
